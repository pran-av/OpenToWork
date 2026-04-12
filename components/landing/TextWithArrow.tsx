"use client";

import { Fragment } from "react";
import { ArrowRight } from "lucide-react";

type Props = {
  text: string;
  className?: string;
  iconClassName?: string;
};

/** Renders `→` in copy as a Lucide arrow for consistent visuals. */
export function TextWithArrow({ text, className, iconClassName }: Props) {
  const parts = text.split("→");
  if (parts.length === 1) {
    return <span className={className}>{text}</span>;
  }

  const iconCls =
    iconClassName ??
    "h-3.5 w-3.5 shrink-0 text-gray-500 opacity-80 sm:h-4 sm:w-4 lg:h-[1em] lg:w-[1em]";

  return (
    <span className={className}>
      <span className="inline-flex flex-wrap items-center gap-x-0.5 sm:gap-x-1">
        {parts.map((part, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <ArrowRight className={iconCls} strokeWidth={2} aria-hidden />
            ) : null}
            <span className="min-w-0">{part}</span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
