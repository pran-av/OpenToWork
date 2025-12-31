"use client";

import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer className="border-t border-orange-100 bg-white/80 backdrop-blur-sm dark:border-orange-900/30 dark:bg-zinc-900/80">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-sm text-gray-600 dark:text-zinc-400">
          All rights reserved. © 2025 - 2026 Pitch Like This | {" "}
          <Link
            href="https://x.com/pranavdotexe"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-800 transition-colors hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-50 dark:hover:text-orange-400"
          >
            Pranav Mandhare
          </Link>
        </p>
      </div>
    </footer>
  );
}

