import Link from "next/link";
import { ModelTheme } from "@/components/model-toggle";

export default function Home() {
  return (
    <div className="text-neutral-900 dark:text-neutral-300">
      <ModelTheme />
      <div className="flex gap-4">
        <Link href="/signup">Get Started</Link>
        <Link href="/signin">Login</Link>
      </div>
    </div>
  );
}
