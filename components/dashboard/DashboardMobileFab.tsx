"use client";

import type { MouseEventHandler } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

const fabClassName =
  "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_4px_14px_rgba(234,88,12,0.55),0_2px_6px_rgba(15,23,42,0.18)] transition-all duration-200 hover:scale-105 hover:bg-orange-600 hover:shadow-[0_8px_24px_rgba(234,88,12,0.5),0_4px_12px_rgba(15,23,42,0.22)] active:scale-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 md:h-12 md:w-[3.75rem] md:rounded-2xl md:px-2";

const wrapperClassName =
  "pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+7rem)] right-4 z-40 md:right-10 lg:hidden";

type DashboardMobileFabLinkProps = {
  href: string;
  ariaLabel: string;
  /** Extra classes on the link (e.g. Sage dashboard highlight target). */
  linkClassName?: string;
  /** Matches `DashboardSageFrame` onboarding selectors that use `[data-sage-target=…]`. */
  dataSageTarget?: string;
  /** Runs when the FAB link navigation is clicked (e.g. intercept onboarding ACK before navigate). */
  linkOnNavigateClick?: MouseEventHandler<HTMLAnchorElement>;
};

type DashboardMobileFabButtonProps = {
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  dataSageTarget?: string;
};

export type DashboardMobileFabProps = DashboardMobileFabLinkProps | DashboardMobileFabButtonProps;

export function DashboardMobileFab(props: DashboardMobileFabProps) {
  const icon = (
    <Plus className="h-6 w-6 md:h-[1.35rem] md:w-[1.35rem]" strokeWidth={2.25} aria-hidden />
  );

  return (
    <div className={wrapperClassName}>
      {"href" in props ? (
        <Link
          href={props.href}
          onClick={props.linkOnNavigateClick}
          className={`${fabClassName}${props.linkClassName ? ` ${props.linkClassName}` : ""}`}
          aria-label={props.ariaLabel}
          {...(props.dataSageTarget
            ? { "data-sage-target": props.dataSageTarget }
            : {})}
        >
          {icon}
        </Link>
      ) : (
        <button
          type="button"
          onClick={props.onClick}
          disabled={props.disabled}
          className={fabClassName}
          aria-label={props.ariaLabel}
          {...(props.dataSageTarget ? { "data-sage-target": props.dataSageTarget } : {})}
        >
          {icon}
        </button>
      )}
    </div>
  );
}
