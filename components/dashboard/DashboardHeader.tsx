"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
}

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Sync theme after client mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch profile data for header display
  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      if (response.ok && data.profile) {
        setProfile({
          display_name: data.profile.display_name,
          avatar_url: data.profile.avatar_url,
        });
      }
    } catch (error) {
      // Silently fail - profile display is optional
    }
  };

  useEffect(() => {
    fetchProfile();
    
    // Listen for profile update events
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    
    window.addEventListener("profileUpdated", handleProfileUpdate);
    
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
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
              sizes="32px"
              className="object-contain object-left"
              priority
            />
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-lg font-semibold text-gray-800 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-50 dark:hover:text-orange-400"
          >
            Studio
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
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

          {/* Profile Dropdown - Priority: Avatar > Display Name > CTA */}
          <DropdownMenu
            align="right"
            trigger={
              profile?.avatar_url ? (
                <div className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:hover:bg-zinc-800 cursor-pointer">
                  <div className="relative h-8 w-8 rounded-full overflow-hidden border border-orange-200 dark:border-orange-800">
                    <Image
                      src={profile.avatar_url}
                      alt="Profile"
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 dark:text-zinc-400"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              ) : profile?.display_name ? (
                <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer">
                  <span>
                    {profile.display_name.length > 20 
                      ? `${profile.display_name.substring(0, 20)}...` 
                      : profile.display_name}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 dark:text-zinc-400"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer">
                  <span>Update Profile</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              )
            }
          >
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              Update Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

