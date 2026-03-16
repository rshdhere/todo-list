import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { JWT_SECRET } from "@todo-list/config";
import { db, eq } from "@todo-list/drizzle";
import { authSchema } from "@todo-list/validators";
import { publicProcedure, router } from "../../trpc.js";
import { usersTable } from "@todo-list/drizzle/database";

export const userRouter = router({
  signup: publicProcedure
    .input(authSchema.input)
    .output(authSchema.output)
    .mutation(async ({ input }) => {
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (users.length > 0) {
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

      return { userId: user.userId };
    }),

  signin: publicProcedure
    .input(authSchema.input)
    .output(authSchema.signinOutput)
    .mutation(async ({ input }) => {
      const [user] = await db
        .select({
          userId: usersTable.id,
          password: usersTable.password,
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

      if (!JWT_SECRET) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "JWT secret is not configured",
        });
      }

      const token = jwt.sign({ userId: user.userId }, JWT_SECRET, {
        expiresIn: "1hr",
      });

      return { token };
    }),
});
