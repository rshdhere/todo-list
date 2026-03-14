import { privateProcedure, router } from "@/src/trpc.js";
import { todoSchema } from "@todo-list/validators";

export const todoRouter = router({
  create: privateProcedure
    .input(todoSchema.createInput)
    .output(todoSchema.createOutput)
    .mutation(({ input, ctx }) => {}),

  get: privateProcedure
    .output(todoSchema.getOutput)
    .query(({ input, ctx }) => {}),

  update: privateProcedure
    .input(todoSchema.updateInput)
    .output(todoSchema.updateOutput)
    .mutation(({ input, ctx }) => {}),

  delete: privateProcedure
    .input(todoSchema.deleteInput)
    .output(todoSchema.deleteOutput)
    .mutation(({ input, ctx }) => {}),
});
