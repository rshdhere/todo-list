import type { AppRouter } from "@todo-list/api";
import { createTRPCContext } from "@trpc/tanstack-react-query";

type TRPCContext = ReturnType<typeof createTRPCContext<AppRouter>>;

const trpcContext: TRPCContext = createTRPCContext<AppRouter>();

export const TRPCProvider: TRPCContext["TRPCProvider"] =
  trpcContext.TRPCProvider;
export const useTRPC: TRPCContext["useTRPC"] = trpcContext.useTRPC;
export const useTRPCClient: TRPCContext["useTRPCClient"] =
  trpcContext.useTRPCClient;
