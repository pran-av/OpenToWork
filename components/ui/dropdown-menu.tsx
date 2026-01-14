"use client";

import { useState, useRef, useEffect, createContext, useContext } from "react";

interface DropdownMenuContextType {
  close: () => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | null>(null);

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <DropdownMenuContext.Provider value={{ close }}>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 rounded-md"
          aria-expanded={isOpen}
          aria-haspopup="true"
          type="button"
        >
          {trigger}
        </button>
        {isOpen && (
          <div
            className={`absolute z-50 mt-2 min-w-[200px] rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const context = useContext(DropdownMenuContext);

  return (
    <button
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
          // Close dropdown after click
          if (context) {
            context.close();
          }
        }
      }}
      disabled={disabled}
      className="w-full px-4 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
    >
      {children}
    </button>
  );
}

