export default function SignIn() {
  return (
    <form className="flex flex-col gap-y-2">
      <input
        type="email"
        placeholder="email"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
      <input
        type="password"
        placeholder="password"
        className="rounded px-4 py-2.5 outline-none selection:bg-emerald-300"
      />
    </form>
  );
}
