import { Suspense } from "react";
import AuthPageContent from "./AuthPageContent";

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Sign in to your account
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
