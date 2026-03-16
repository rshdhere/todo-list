import { TRPCError } from "@trpc/server";
import { and, db, eq } from "@todo-list/drizzle";
import { todoSchema } from "@todo-list/validators";
import { privateProcedure, router } from "../../trpc.js";
import { todosTable } from "@todo-list/drizzle/database";

export const todoRouter = router({
  create: privateProcedure
    .input(todoSchema.createInput)
    .output(todoSchema.createOutput)
    .mutation(async ({ input, ctx }) => {
      const [todo] = await db
        .insert(todosTable)
        .values({
          userId: ctx.userId,
          title: input.title,
          description: input.description,
        })
        .returning({ todoId: todosTable.id });

      if (!todo) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "failed to create todo",
        });
      }

      return { todoId: todo.todoId };
    }),

  get: privateProcedure.output(todoSchema.getOutput).query(async ({ ctx }) => {
    const todos = await db
      .select({
        todoId: todosTable.id,
        title: todosTable.title,
        description: todosTable.description,
        done: todosTable.done,
        createdAt: todosTable.createdAt,
        updatedAt: todosTable.updatedAt,
      })
      .from(todosTable)
      .where(eq(todosTable.userId, ctx.userId))
      .orderBy(todosTable.createdAt);

    return {
      todos: todos.map((todo) => ({
        ...todo,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
      })),
    };
  }),

  update: privateProcedure
    .input(todoSchema.updateInput)
    .output(todoSchema.updateOutput)
    .mutation(async ({ input, ctx }) => {
      const updateValues = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.done !== undefined ? { done: input.done } : {}),
        updatedAt: new Date(),
      };

      if (Object.keys(updateValues).length === 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "at least one field is required to update a todo",
        });
      }

      const [updatedTodo] = await db
        .update(todosTable)
        .set(updateValues)
        .where(
          and(
            eq(todosTable.id, input.todoId),
            eq(todosTable.userId, ctx.userId),
          ),
        )
        .returning({ todoId: todosTable.id });

      return { updated: Boolean(updatedTodo) };
    }),

  delete: privateProcedure
    .input(todoSchema.deleteInput)
    .output(todoSchema.deleteOutput)
    .mutation(async ({ input, ctx }) => {
      const [deletedTodo] = await db
        .delete(todosTable)
        .where(
          and(
            eq(todosTable.id, input.todoId),
            eq(todosTable.userId, ctx.userId),
          ),
        )
        .returning({ todoId: todosTable.id });

      return { deleted: Boolean(deletedTodo) };
    }),
});
