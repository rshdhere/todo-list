import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { router } from "./trpc.js";
import { and, db, eq } from "@todo-list/drizzle";
import cookieParser from "cookie-parser";
import { TRPCError } from "@trpc/server";
import {
  CLIENT_URL,
  JWT_SECRET,
  REFRESH_TOKEN_SECRET,
} from "@todo-list/config";
import { refreshTokensTable, usersTable } from "@todo-list/drizzle/database";
import { isEmailVerificationTokenPayload } from "./email/verification.js";
import { userRouter } from "./routes/v1/user.js";
import { todoRouter } from "./routes/v1/todo.js";
import * as trpcExpress from "@trpc/server/adapters/express";
import {
  createRefreshToken,
  hashRefreshToken,
  isRefreshTokenPayload,
  refreshTokenCookieClearOptions,
  refreshTokenCookieOptions,
  refreshTokenHashMatches,
} from "./auth/refresh-token.js";

export const appRouter = router({
  v1: router({
    user: userRouter,
    todo: todoRouter,
  }),
});

export type AppRouter = typeof appRouter;

export const app = express();

app.use(
  cors({
    credentials: true,
    origin: CLIENT_URL,
  }),
);

app.use(cookieParser());

function getVerificationRedirectUrl() {
  if (!CLIENT_URL) {
    return null;
  }

  try {
    const redirectUrl = new URL("/", CLIENT_URL);
    redirectUrl.searchParams.set("emailVerified", "1");
    return redirectUrl.toString();
  } catch {
    return null;
  }
}

async function handleEmailVerification(req: Request, res: Response) {
  const token =
    typeof req.query.token === "string" ? req.query.token : undefined;

  if (!token) {
    res.status(400).send("verification token is missing");
    return;
  }

  if (!JWT_SECRET) {
    res.status(500).send("server secret is not configured");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isEmailVerificationTokenPayload(decoded)) {
      res.status(400).send("invalid verification token");
      return;
    }

    const [verifiedUser] = await db
      .update(usersTable)
      .set({ isEmailVerified: true })
      .where(eq(usersTable.id, decoded.userId))
      .returning({ userId: usersTable.id });

    if (!verifiedUser) {
      res.status(404).send("user not found");
      return;
    }

    if (!REFRESH_TOKEN_SECRET) {
      res.status(500).send("refresh token secret is not configured");
      return;
    }

    const nextRefreshToken = createRefreshToken(
      decoded.userId,
      REFRESH_TOKEN_SECRET,
    );

    await db.insert(refreshTokensTable).values({
      userId: decoded.userId,
      tokenId: nextRefreshToken.tokenId,
      tokenHash: hashRefreshToken(nextRefreshToken.refreshToken),
      expiresAt: nextRefreshToken.expiresAt,
    });

    res.cookie(
      "refreshToken",
      nextRefreshToken.refreshToken,
      refreshTokenCookieOptions,
    );

    const redirectUrl = getVerificationRedirectUrl();

    if (redirectUrl) {
      res.redirect(302, redirectUrl);
      return;
    }

    res.status(200).send("email verified successfully");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError")
    ) {
      res.status(400).send("invalid verification token");
      return;
    }

    console.error("failed to verify email", error);
    res.status(500).send("failed to verify email");
  }
}

app.get("/verify-email", handleEmailVerification);
app.get("/trpc/verify-email", handleEmailVerification);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    async createContext({ req, res }: trpcExpress.CreateExpressContextOptions) {
      const authHeader: string | undefined = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          userId: undefined,
          res,
        };
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        return {
          userId: undefined,
          res,
        };
      }

      if (!JWT_SECRET) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "the JWT_SECRET went missing",
        });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (
          typeof decoded !== "object" ||
          decoded === null ||
          typeof decoded.userId !== "string"
        ) {
          return {
            userId: undefined,
            res,
          };
        }

        const [user] = await db
          .select({
            userId: usersTable.id,
            isEmailVerified: usersTable.isEmailVerified,
          })
          .from(usersTable)
          .where(eq(usersTable.id, decoded.userId));

        if (!user || !user.isEmailVerified) {
          return {
            userId: undefined,
            res,
          };
        }

        return {
          userId: user.userId,
          res,
        };
      } catch {
        return {
          userId: undefined,
          res,
        };
      }
    },
  }),
);

app.post("/refresh", async (req, res) => {
  const refreshToken: string | undefined = req.cookies["refreshToken"];

  if (!refreshToken) {
    res.status(401).json({ message: "refresh token not found" });
    return;
  }

  if (!REFRESH_TOKEN_SECRET || !JWT_SECRET) {
    res.status(500).json({ message: "server secrets are not configured" });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    if (!isRefreshTokenPayload(decoded)) {
      res.clearCookie("refreshToken", refreshTokenCookieClearOptions);
      res.status(401).json({ message: "invalid refresh token" });
      return;
    }

    const [user] = await db
      .select({
        isEmailVerified: usersTable.isEmailVerified,
      })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId));

    if (!user || !user.isEmailVerified) {
      res.clearCookie("refreshToken", refreshTokenCookieClearOptions);
      res.status(401).json({ message: "email is not verified" });
      return;
    }

    const [storedRefreshToken] = await db
      .select({
        refreshTokenId: refreshTokensTable.id,
        tokenHash: refreshTokensTable.tokenHash,
        expiresAt: refreshTokensTable.expiresAt,
      })
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, decoded.userId),
          eq(refreshTokensTable.tokenId, decoded.tokenId),
        ),
      );

    if (
      !storedRefreshToken ||
      !refreshTokenHashMatches(refreshToken, storedRefreshToken.tokenHash)
    ) {
      res.clearCookie("refreshToken", refreshTokenCookieClearOptions);
      res.status(401).json({ message: "invalid refresh token" });
      return;
    }

    if (storedRefreshToken.expiresAt.getTime() <= Date.now()) {
      await db
        .delete(refreshTokensTable)
        .where(eq(refreshTokensTable.id, storedRefreshToken.refreshTokenId));

      res.clearCookie("refreshToken", refreshTokenCookieClearOptions);
      res.status(401).json({ message: "refresh token expired" });
      return;
    }

    const rotatedRefreshToken = createRefreshToken(
      decoded.userId,
      REFRESH_TOKEN_SECRET,
    );

    await db
      .update(refreshTokensTable)
      .set({
        tokenId: rotatedRefreshToken.tokenId,
        tokenHash: hashRefreshToken(rotatedRefreshToken.refreshToken),
        expiresAt: rotatedRefreshToken.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(refreshTokensTable.id, storedRefreshToken.refreshTokenId));

    res.cookie(
      "refreshToken",
      rotatedRefreshToken.refreshToken,
      refreshTokenCookieOptions,
    );

    const accessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "15m",
    });

    res.json({ accessToken, message: "accessToken refreshed!" });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError")
    ) {
      await db
        .delete(refreshTokensTable)
        .where(
          eq(refreshTokensTable.tokenHash, hashRefreshToken(refreshToken)),
        );

      res.clearCookie("refreshToken", refreshTokenCookieClearOptions);
      return res.status(401).json({ message: "Un-Authorized" });
    }

    console.error("failed to refresh access token", error);
    return res.status(500).json({ message: "failed to refresh access token" });
  }
});

app.post("/refresh/logout", async (req, res) => {
  const refreshToken = req.cookies["refreshToken"];
  res.clearCookie("refreshToken", refreshTokenCookieClearOptions);

  if (!refreshToken) {
    res.json({ message: "logged out" });
    return;
  }

  try {
    await db
      .delete(refreshTokensTable)
      .where(eq(refreshTokensTable.tokenHash, hashRefreshToken(refreshToken)));

    res.json({ message: "logged out" });
  } catch (error) {
    console.error("failed to logout refresh token", error);
    res.status(500).json({ message: "failed to logout" });
  }
});
