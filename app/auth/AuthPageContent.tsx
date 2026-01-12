"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthPageContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
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
      } else if (errorParam === "linkedin_no_email") {
        errorMsg = errorDetails 
          ? errorDetails
          : "Your LinkedIn account did not provide a verified email. Please sign up using magic link.";
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

  const handleLinkedInAuth = async () => {
    setIsLinkedInLoading(true);
    setMessage(null);

    // Track LinkedIn button click
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "click", {
        event_category: "CTA",
        event_label: "LinkedIn OAuth",
      });
    }

    // Redirect to LinkedIn OAuth API route
    window.location.href = "/api/auth/linkedin";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-zinc-50">
            {loggedOut ? "You have been logged out" : "Sign in to your account"}
          </h1>
          {loggedOut && (
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
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
          <div className="space-y-6">
            {/* LinkedIn OAuth Button */}
            <button
              type="button"
              onClick={handleLinkedInAuth}
              disabled={isLinkedInLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-md bg-[#0077b5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#006399] focus:outline-none focus:ring-2 focus:ring-[#0077b5] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLinkedInLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>Continue with LinkedIn</span>
                </>
              )}
            </button>

            {/* OR Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">OR</span>
              </div>
            </div>

            {/* Magic Link Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
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
                  className="mt-1 block w-full rounded-md border border-orange-200 bg-white px-3 py-2 text-gray-800 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                  placeholder="you@example.com"
                  disabled={isLoading || isLinkedInLoading}
                />
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-400 text-center">
                By continuing, you agree to the Pitch Like This{" "}
                <a
                  href="/policies/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("/policies/terms-of-service", "_blank", "noopener,noreferrer");
                    window.focus();
                  }}
                  className="text-orange-600 hover:text-orange-700 font-semibold underline"
                >
                  Terms of Service
                </a>
                {" "}and{" "}
                <a
                  href="/policies/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("/policies/privacy", "_blank", "noopener,noreferrer");
                    window.focus();
                  }}
                  className="text-orange-600 hover:text-orange-700 font-semibold underline"
                >
                  Privacy Policy
                </a>
                .
              </p>

              <button
                type="submit"
                disabled={isLoading || isLinkedInLoading || !email.trim()}
                className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Continue with Email"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-400">
                An authentication link has been sent to your email inbox
              </p>
            </div>

            <div className="rounded-md bg-orange-50 p-4 dark:bg-zinc-800">
              <p className="text-sm text-gray-700 dark:text-zinc-300">
                Visit your inbox, open the received email and click on the link
                to login/signup to the app.
              </p>
            </div>

            {canResend ? (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="w-full rounded-md border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {isLoading ? "Resending..." : "Resend Email"}
              </button>
            ) : (
              <button
                disabled
                className="w-full rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
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
              className="w-full text-sm text-gray-600 underline hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

