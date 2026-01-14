"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LinkIdentityDialogProps {
  onDismiss: () => void;
  onLink: () => void;
}

/**
 * Dialog strip component for linking LinkedIn identity
 * Shows below Studio Header with 5 minute countdown timer
 * Uses Supabase linkIdentity() for manual identity linking
 */
export default function LinkIdentityDialog({
  onDismiss,
  onLink,
}: LinkIdentityDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(5 * 60); // 5 minutes in seconds
  const [isLinking, setIsLinking] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (timeRemaining <= 0) {
      onDismiss();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onDismiss]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLink = async () => {
    setIsLinking(true);
    onLink();

    try {
      // console.log("[LinkIdentity] Calling server-side linkIdentity() API...");
      
      // Call server-side API route that runs linkIdentity() with HttpOnly cookies
      const response = await fetch("/api/auth/link-identity", {
        method: "GET",
        credentials: "include", // Include HttpOnly cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to connect LinkedIn";
        // console.error("[LinkIdentity] Server API error:", errorMessage);
        setIsLinking(false);
        setToast({ message: errorMessage, type: "error" });
        // Auto-dismiss toast after 5 seconds
        setTimeout(() => setToast(null), 5000);
        return;
      }

      const data = await response.json();
      
      if (!data.url) {
        // console.error("[LinkIdentity] No OAuth URL returned from server");
        setIsLinking(false);
        setToast({ message: "Failed to initiate LinkedIn connection. Please try again.", type: "error" });
        setTimeout(() => setToast(null), 5000);
        return;
      }

      // console.log("[LinkIdentity] ✅ Success! Redirecting to LinkedIn OAuth URL:", data.url);
      // Redirect to LinkedIn OAuth URL returned from server
      window.location.href = data.url;
    } catch (error) {
      // console.error("[LinkIdentity] Unexpected error:", error);
      setIsLinking(false);
      setToast({ message: "An unexpected error occurred. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <div className="border-b border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-zinc-900/50">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0">
            <svg
              className="h-5 w-5 text-orange-600 dark:text-orange-400"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">
              Connect your LinkedIn account to sign in faster
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-mono text-gray-600 dark:text-zinc-400">
            {formatTime(timeRemaining)}
          </div>
          <button
            onClick={handleLink}
            disabled={isLinking}
            className="rounded-md bg-[#0077b5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#006399] focus:outline-none focus:ring-2 focus:ring-[#0077b5] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
          >
            {isLinking ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Redirecting...</span>
              </>
            ) : (
              "Connect LinkedIn"
            )}
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition-colors hover:bg-orange-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Dismiss"
            title="Dismiss"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-6 py-4 shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

