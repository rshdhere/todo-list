import { publicProcedure, router } from "@/src/trpc.js";
import { authSchema } from "@todo-list/validators";

export const userRouter = router({
  signup: publicProcedure
    .input(authSchema.input)
    .output(authSchema.output)
    .mutation(({ input }) => {}),

  signin: publicProcedure
    .input(authSchema.input)
    .output(authSchema.signinOutput)
    .mutation(({ input }) => {}),
});
