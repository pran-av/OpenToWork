"use client";

import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          All rights reserved. © 2025{" "}
          <Link
            href="https://x.com/pranavdotexe"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-900 transition-colors hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            Pranav Mandhare
          </Link>
        </p>
      </div>
    </footer>
  );
}

