"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Sync theme after client mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = () => {
    if (!setTheme) return;
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

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
    <header className="border-b border-orange-100 bg-white/80 backdrop-blur-sm dark:border-orange-900/30 dark:bg-zinc-900/80">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative h-8 w-8">
            <Image
              src="/pitchlikethis-logo.svg"
              alt="Pitch Like This"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          {!isDashboardHome && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Back to Studio"
              aria-label="Back to Studio"
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
            className="text-lg font-semibold text-gray-800 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-50 dark:hover:text-orange-400"
          >
            Studio
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Toggle - positioned on the right side */}
          {mounted && (
            <button
              onClick={handleThemeToggle}
              className="flex items-center justify-center rounded-md p-2 text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
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
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
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
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}

