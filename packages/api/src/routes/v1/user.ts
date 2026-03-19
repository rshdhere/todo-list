import type { Response } from "express";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { db, eq } from "@todo-list/drizzle";
import { authSchema } from "@todo-list/validators";
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from "@todo-list/config";
import { publicProcedure, router } from "../../trpc.js";
import {
  createRefreshToken,
  hashRefreshToken,
  refreshTokenCookieOptions,
} from "../../auth/refresh-token.js";
import { sendVerificationEmail } from "../../email/verification.js";
import { refreshTokensTable, usersTable } from "@todo-list/drizzle/database";

const MAX_VERIFICATION_EMAIL_RESENDS = 1;
const verificationResendAttemptsByEmail = new Map<string, number>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function consumeVerificationResendAttempt(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const currentCount =
    verificationResendAttemptsByEmail.get(normalizedEmail) ?? 0;

  if (currentCount >= MAX_VERIFICATION_EMAIL_RESENDS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "verification email can be resent only once",
    });
  }

  verificationResendAttemptsByEmail.set(normalizedEmail, currentCount + 1);
}

async function createSessionTokens(userId: string, res: Response) {
  if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "JWT secret's are not baked in the server",
    });
  }

  const { refreshToken, tokenId, expiresAt } = createRefreshToken(
    userId,
    REFRESH_TOKEN_SECRET,
  );

  await db.insert(refreshTokensTable).values({
    userId,
    tokenId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
  });

  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
  });

  return { accessToken };
}

export const userRouter = router({
  signup: publicProcedure
    .input(authSchema.input)
    .output(authSchema.signupOutput)
    .mutation(async ({ input }) => {
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (users.length > 0) {
        const existingUser = users[0];

        if (!existingUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "failed to load user",
          });
        }

        if (!existingUser.isEmailVerified) {
          consumeVerificationResendAttempt(input.email);
          await sendVerificationEmail(existingUser.id, input.email);
          return { message: "verification email sent" };
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: "user already exists",
        });
      }

      const HashedPassword = await Bun.password.hash(input.password);

      const [user] = await db
        .insert(usersTable)
        .values({
          email: input.email,
          password: HashedPassword,
        })
        .returning({ userId: usersTable.id });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "failed to create user",
        });
      }

      await sendVerificationEmail(user.userId, input.email);
      return { message: "verification email sent" };
    }),

  resendVerificationEmail: publicProcedure
    .input(authSchema.resendVerificationInput)
    .output(authSchema.signupOutput)
    .mutation(async ({ input }) => {
      const [user] = await db
        .select({
          userId: usersTable.id,
          isEmailVerified: usersTable.isEmailVerified,
        })
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (!user || user.isEmailVerified) {
        return {
          message: "if the account exists, a verification email was sent",
        };
      }

      consumeVerificationResendAttempt(input.email);
      await sendVerificationEmail(user.userId, input.email);
      return { message: "verification email sent" };
    }),

  signin: publicProcedure
    .input(authSchema.input)
    .output(authSchema.output)
    .mutation(async ({ input, ctx }) => {
      const [user] = await db
        .select({
          userId: usersTable.id,
          password: usersTable.password,
          isEmailVerified: usersTable.isEmailVerified,
        })
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "user not found",
        });
      }

      const isValidPassword = await Bun.password.verify(
        input.password,
        user.password,
      );

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "invalid credentials",
        });
      }

      if (!user.isEmailVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "email is not verified",
        });
      }

      return createSessionTokens(user.userId, ctx.res);
    }),
});
