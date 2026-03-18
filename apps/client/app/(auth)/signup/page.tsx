"use client";

import { useTRPC } from "@/utils/trpc";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema, type SignUpSchema } from "@todo-list/validators";

export default function SignUp() {
  const router = useRouter();
  const trpc = useTRPC();

  const { setAuthToken } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignUpSchema>({
    resolver: zodResolver(authSchema.input),
  });

  const signupMutation = useMutation(trpc.v1.user.signup.mutationOptions());

  const onSubmit = (data: SignUpSchema) => {
    signupMutation.mutate(data, {
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
        maxLength={32}
        placeholder="email"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
      {errors.email && (
        <p className="text-red-500">{`${errors.email.message}`}</p>
      )}
      <input
        {...register("password")}
        type="password"
        maxLength={24}
        placeholder="password"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
      {errors.password && (
        <p className="text-red-500">{`${errors.password.message}`}</p>
      )}
      <button
        disabled={signupMutation.isPending}
        type="submit"
        className="cursor-pointer rounded bg-emerald-400 py-2 text-neutral-900 disabled:bg-gray-300"
      >
        Submit
      </button>
      {signupMutation.error && (
        <p className="text-red-500">{signupMutation.error.message}</p>
      )}
    </form>
  );
}
