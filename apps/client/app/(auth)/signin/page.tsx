"use client";

import { useTRPC } from "@/utils/trpc";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema, type SignInSchema } from "@todo-list/validators";

export default function SignIn() {
  const router = useRouter();
  const trpc = useTRPC();
  const { setAuthToken } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignInSchema>({
    resolver: zodResolver(authSchema.input),
  });

  const signinMutation = useMutation(trpc.v1.user.signin.mutationOptions());

  const onSubmit = (data: SignInSchema) => {
    signinMutation.mutate(data, {
      onSuccess: (result) => {
        setAuthToken(result.accessToken);
        reset();
        router.replace("/");
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
      <input
        {...register("email")}
        type="email"
        placeholder="email"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
      {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      <input
        {...register("password")}
        type="password"
        placeholder="password"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
      {errors.password && (
        <p className="text-red-500">{errors.password.message}</p>
      )}
      <button
        disabled={signinMutation.isPending}
        type="submit"
        className="cursor-pointer rounded bg-emerald-400 py-2 text-neutral-900 disabled:bg-gray-300"
      >
        Login
      </button>
      {signinMutation.error && (
        <p className="text-red-500">{signinMutation.error.message}</p>
      )}
    </form>
  );
}
