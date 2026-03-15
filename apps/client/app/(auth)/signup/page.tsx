"use client";

import { useState } from "react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // TODO: submit to server
    // ....
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-2">
        <input
          required
          type="email"
          value={email}
          maxLength={32}
          placeholder="email"
          onChange={(e) => setEmail(e.target.value)}
          className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
        />
        <input
          required
          type="password"
          value={password}
          maxLength={24}
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
        />
        <button
          type="submit"
          className="cursor-pointer rounded bg-emerald-400 py-2 text-neutral-900 disabled:bg-gray-300"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
