import { z } from "zod";
import { authSchema } from "@todo-list/validators/user";

export * from "@todo-list/validators/user";
export * from "@todo-list/validators/todo";

export type AuthSchema = z.infer<typeof authSchema.input>;
export type SignUpSchema = AuthSchema;
export type SignInSchema = AuthSchema;
export type ResendVerificationSchema = z.infer<
  typeof authSchema.resendVerificationInput
>;
