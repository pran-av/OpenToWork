"use client";

import * as React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center lg:items-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
      />
      <div
        className="relative z-50 mx-auto flex w-full max-w-md flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900 max-lg:h-[80dvh] max-lg:rounded-b-none max-lg:rounded-t-2xl max-lg:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className = "" }: DialogContentProps) {
  return <div className={className}>{children}</div>;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-xl font-semibold text-black dark:text-zinc-50 ${className}`}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({
  children,
  className = "",
}: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-zinc-600 dark:text-zinc-400 ${className}`}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div className={`mt-6 flex justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}

