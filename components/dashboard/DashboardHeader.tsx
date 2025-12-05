"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardHeader() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!res.ok) {
        // If logout fails, keep user on page but log error
        const data = await res.json().catch(() => ({}));
        console.error("Error logging out:", data);
        setIsLoggingOut(false);
        return;
      }

      router.push("/auth?loggedOut=true");
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
          Dashboard
        </h1>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}

