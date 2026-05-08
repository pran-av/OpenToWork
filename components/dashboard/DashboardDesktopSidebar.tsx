"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, ChevronLeft, LogOut, Megaphone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { setSageMobileUserHoldOpen } from "@/components/dashboard/SageWindow";

/**
 * Terminology guard (UI copy only): keep these user-facing terms stable.
 * - Project -> Application
 * - Campaign -> Pitch
 * - Lead -> Recruiter
 * Do not rename internal routes/types/identifiers from this comment.
 */
type DesktopNavItem = {
  key: "experiences" | "campaigns" | "profile";
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  id?: string;
};

const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
  {
    key: "experiences",
    label: "Experiences",
    href: "/dashboard",
    icon: BriefcaseBusiness,
  },
  {
    key: "campaigns",
    label: "Applications", // Terminology guard: keep this term stable.
    href: "/dashboard/projects",
    icon: Megaphone,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
    id: "profile-desktop-sage-target",
  },
];

export default function DashboardDesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      sessionStorage.removeItem("opentowork-sage-onboarding-v1");
      sessionStorage.removeItem("opentowork-sage-task-nav-v1");
      setSageMobileUserHoldOpen(false);
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setIsLoggingOut(false);
        return;
      }
      router.push("/auth?loggedOut=true");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const isActive = (key: DesktopNavItem["key"]): boolean => {
    if (key === "campaigns") return pathname.startsWith("/dashboard/projects");
    if (key === "profile") return pathname.startsWith("/dashboard/profile");
    return pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/projects") && !pathname.startsWith("/dashboard/profile");
  };

  return (
    <aside
      className={cn(
        "hidden border-r border-orange-100 bg-white/70 backdrop-blur-sm transition-[width] duration-200 dark:border-orange-900/40 dark:bg-zinc-900/60 lg:flex lg:flex-col",
        collapsed ? "lg:w-16" : "lg:w-60"
      )}
      aria-label="Desktop sidebar navigation"
    >
      <div className="flex items-center justify-end p-2">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-orange-300"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-2 pb-3">
        {DESKTOP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.key);
          return (
            <button
              key={item.key}
              id={item.id}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-orange-100 text-orange-800 dark:bg-zinc-800 dark:text-orange-300"
                  : "text-zinc-700 hover:bg-orange-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              )}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="px-2 pb-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "text-zinc-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          )}
          title={collapsed ? "Logout" : undefined}
          aria-label={isLoggingOut ? "Logging out" : "Logout"}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed ? <span>{isLoggingOut ? "Logging out..." : "Logout"}</span> : null}
        </button>
      </div>
    </aside>
  );
}
