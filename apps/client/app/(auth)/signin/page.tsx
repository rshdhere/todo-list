"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema } from "@todo-list/validators";

export default function SignIn() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(authSchema.input),
  });

  const onSubmit = () => {
    // TODO : send it to server
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
      <input
        {...register("email")}
        type="email"
        placeholder="email"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
      <input
        {...register("password")}
        type="password"
        placeholder="password"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
    </form>
  );
}
