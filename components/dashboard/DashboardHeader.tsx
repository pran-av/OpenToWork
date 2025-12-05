"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if we're on the main dashboard page
  const isDashboardHome = pathname === "/dashboard";

  const handleBack = () => {
    if (isDashboardHome) {
      // Already on dashboard home, do nothing or could navigate to a different default
      return;
    }
    // Navigate back to previous page
    router.back();
  };

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
        <div className="flex items-center gap-4">
          {!isDashboardHome && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center rounded-md p-2 text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </button>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="text-lg font-semibold text-black transition-colors hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            Dashboard
          </button>
        </div>
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

