"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Accordion({ 
  title, 
  children, 
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle
}: AccordionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onToggle || setInternalIsOpen;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
      >
        {typeof title === "string" ? (
          <span className="font-medium text-black dark:text-zinc-50">{title}</span>
        ) : (
          title
        )}
        <ChevronDown
          className={`h-5 w-5 text-zinc-500 transition-transform dark:text-zinc-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}

