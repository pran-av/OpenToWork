"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const isDashboardHome = pathname === "/dashboard";

  if (isDashboardHome) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="border-b border-orange-100 bg-white/80 backdrop-blur-sm dark:border-orange-900/30 dark:bg-zinc-900/80">
      <div className="container mx-auto px-4 py-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title="Back to Studio"
          aria-label="Back to Studio"
        >
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
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <span>Back</span>
        </button>
      </div>
    </div>
  );
}

