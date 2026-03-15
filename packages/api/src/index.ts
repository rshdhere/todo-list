import express from "express";
import jwt from "jsonwebtoken";
import { router } from "@/src/trpc.js";
import { TRPCError } from "@trpc/server";
import { JWT_SECRET } from "@todo-list/config";
import { userRouter } from "@/src/routes/v1/user.js";
import { todoRouter } from "@/src/routes/v1/todo.js";
import * as trpcExpress from "@trpc/server/adapters/express";

export const appRouter = router({
  v1: router({
    user: userRouter,
    todo: todoRouter,
  }),
});

export type AppRouter = typeof appRouter;

export const app = express();

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext({ req }: trpcExpress.CreateExpressContextOptions) {
      const authHeader: string | undefined = req.headers.authorization;

      if (!authHeader || authHeader.endsWith(" Bearer")) {
        return {
          userId: undefined,
        };
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        return {
          userId: undefined,
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
          typeof decoded.userId !== "string" ||
          decoded === null
        ) {
          return {
            userId: undefined,
          };
        }

        return {
          userId: decoded.userId,
        };
      } catch {
        return {
          userId: undefined,
        };
      }
    },
  }),
);
