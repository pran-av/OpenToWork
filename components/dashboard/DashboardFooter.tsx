"use client";

import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer className="border-t border-orange-100 bg-white/80 backdrop-blur-sm dark:border-orange-900/30 dark:bg-zinc-900/80">
      <div className="px-4 py-3 sm:px-6">
        <p className="text-left text-xs font-normal text-gray-500 dark:text-zinc-400">
          All rights reserved. © 2025 - 2026 Pitch Like This |{" "}
          <a
            href="/policies/privacy"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.open("/policies/privacy", "_blank", "noopener,noreferrer");
              window.focus();
            }}
            className="font-normal text-gray-600 underline transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:text-orange-400"
          >
            Privacy Policy
          </a>
          {" | "}
          <a
            href="/policies/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.open("/policies/terms-of-service", "_blank", "noopener,noreferrer");
              window.focus();
            }}
            className="font-normal text-gray-600 underline transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:text-orange-400"
          >
            Terms of Service
          </a>
          {" | "}
          <Link
            href="https://x.com/pranavdotexe"
            target="_blank"
            rel="noopener noreferrer"
            className="font-normal text-gray-600 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-300 dark:hover:text-orange-400"
          >
            Pranav Mandhare
          </Link>
        </p>
      </div>
    </footer>
  );
}

