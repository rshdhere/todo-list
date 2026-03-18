"use client";

import Link from "next/link";
import { useState } from "react";
import { ModelTheme } from "@/components/model-toggle";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { FastLoader } from "@/components/fast-loader";

export default function Home() {
  const router = useRouter();
  const { isAuthReady, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    await logout();
    router.replace("/signin");
  };

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-900 dark:text-neutral-300">
        <FastLoader content="Loading" />
      </div>
    );
  }

  return (
    <div className="text-neutral-900 dark:text-neutral-300">
      <ModelTheme />
      <div className="flex gap-4">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex cursor-pointer items-center underline disabled:cursor-not-allowed"
          >
            {isLoggingOut ? <FastLoader content="Logging out..." /> : "Logout"}
          </button>
        ) : (
          <>
            <Link href="/signup">Get Started</Link>
            <Link href="/signin">Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
