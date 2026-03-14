import { z } from "@/src/index.js";

const todoId = z.object({ todoId: z.uuid() }).strict();

const todoBody = z
  .object({
    title: z
      .string()
      .min(1, { message: "title is required" })
      .max(100, { message: "title must be 100 characters or fewer" }),
    description: z
      .string()
      .max(500, { message: "description must be 500 characters or fewer" })
      .optional(),
  })
  .strict();

const todoItem = z
  .object({
    todoId: z.uuid(),
    title: z.string(),
    description: z.string().nullable(),
    done: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const todoSchema = {
  createInput: todoBody,
  createOutput: z.object({ todoId: z.uuid() }).strict(),

  getOutput: z.object({ todos: z.array(todoItem) }).strict(),

  updateInput: todoId
    .extend({
      title: todoBody.shape.title.optional(),
      description: todoBody.shape.description,
      done: z.boolean().optional(),
    })
    .strict(),
  updateOutput: z.object({ updated: z.boolean() }).strict(),

  deleteInput: todoId,
  deleteOutput: z.object({ deleted: z.boolean() }).strict(),
};
