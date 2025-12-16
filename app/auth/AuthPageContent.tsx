"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthPageContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const loggedOut = searchParams.get("loggedOut") === "true";
  const errorParam = searchParams.get("error");
  const errorDetails = searchParams.get("details");

  useEffect(() => {
    // Display error from URL params if present
    if (errorParam) {
      let errorMsg = "Authentication failed";
      if (errorParam === "auth_failed") {
        errorMsg = errorDetails 
          ? `Authentication failed: ${errorDetails}`
          : "Authentication failed. Please check your email link or try again.";
      } else if (errorParam === "no_code") {
        errorMsg = errorDetails 
          ? errorDetails
          : "No authentication code received. Please try signing in again.";
      } else if (errorParam === "expired") {
        errorMsg = errorDetails 
          ? errorDetails
          : "The magic link has expired. Please request a new one.";
      } else if (errorParam === "token_error") {
        errorMsg = errorDetails 
          ? errorDetails
          : "Invalid token. Please request a new magic link.";
      } else {
        errorMsg = errorDetails || `Authentication error: ${errorParam}`;
      }
      setMessage(errorMsg);
    }
  }, [errorParam, errorDetails]);

  useEffect(() => {
    // If middleware keeps an authenticated user on /auth, redirect manually
    // (defensive; typically middleware will already redirect)
    const controller = new AbortController();
    const check = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.push("/dashboard");
          }
        }
      } catch {
        // ignore
      }
    };
    check();

    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    // Handle resend cooldown timer
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCooldown === 0 && emailSent) {
      setCanResend(true);
    }
  }, [resendCooldown, emailSent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Track Continue button click
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "click", {
        event_category: "CTA",
        event_label: "Submit Email",
      });
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`Error: ${data.error ?? "Failed to send magic link"}`);
        setIsLoading(false);
        return;
      }

      setEmailSent(true);
      setCanResend(false);
      setResendCooldown(60); // 1 minute cooldown
      setIsLoading(false);
    } catch (error) {
      setMessage("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`Error: ${data.error ?? "Failed to resend email"}`);
        setIsLoading(false);
        return;
      }

      setCanResend(false);
      setResendCooldown(60);
      setIsLoading(false);
    } catch (error) {
      setMessage("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {loggedOut ? "You have been logged out" : "Sign in to your account"}
          </h1>
          {loggedOut && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Please sign in again to continue
            </p>
          )}
        </div>

        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              message.includes("Error")
                ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                : "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            }`}
          >
            {message}
          </div>
        )}

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isLoading ? "Sending..." : "Continue"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">
                An authentication link has been sent to your email inbox
              </p>
            </div>

            <div className="rounded-md bg-zinc-50 p-4 dark:bg-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Visit your inbox, open the received email and click on the link
                to login/signup to the app.
              </p>
            </div>

            {canResend ? (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {isLoading ? "Resending..." : "Resend Email"}
              </button>
            ) : (
              <button
                disabled
                className="w-full rounded-md border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              >
                Resend Email ({resendCooldown}s)
              </button>
            )}

            <button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
                setMessage(null);
              }}
              className="w-full text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

