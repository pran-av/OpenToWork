"use client";

import { ArrowLeft } from "lucide-react";

const baseClass =
  "inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

export default function StudioBackButton({
  onClick,
  disabled,
  className,
  title = "Back",
  "aria-label": ariaLabel = "Back",
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={className ? `${baseClass} ${className}` : baseClass}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </button>
  );
}
