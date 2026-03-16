import { z } from "zod";
import { authSchema } from "@todo-list/validators/user";

export * from "@todo-list/validators/user";
export * from "@todo-list/validators/todo";

export type SignUpSchema = z.infer<typeof authSchema.input>;
