export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-zinc-50"></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Authenticating... Please wait.
        </p>
      </div>
    </div>
  );
}
