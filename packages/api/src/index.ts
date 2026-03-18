import cors from "cors";
import express from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { router } from "./trpc.js";
import { and, db, eq } from "@todo-list/drizzle";
import cookieParser from "cookie-parser";
import { TRPCError } from "@trpc/server";
import {
  CLIENT_URL,
  JWT_SECRET,
  REFRESH_TOKEN_SECRET,
} from "@todo-list/config";
import { refreshTokensTable } from "@todo-list/drizzle/database";
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

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext({ req, res }: trpcExpress.CreateExpressContextOptions) {
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
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (
          typeof decoded !== "object" ||
          typeof decoded.userId !== "string" ||
          decoded === null
        ) {
          return {
            userId: undefined,
            res,
          };
        }

        return {
          userId: decoded.userId,
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
