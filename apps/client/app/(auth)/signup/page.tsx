"use client";

import { useForm, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema, type SignUpSchema } from "@todo-list/validators";

export default function SignUp() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignUpSchema>({
    resolver: zodResolver(authSchema.input),
  });

  const onSubmit = async (data: FieldValues) => {
    // TODO: submit to server
    // ....

    reset;
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
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
          disabled={isSubmitting}
          type="submit"
          className="cursor-pointer rounded bg-emerald-400 py-2 text-neutral-900 disabled:bg-gray-300"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
