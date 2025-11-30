"use client";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-gray-700">
          Campaign Not Found
        </h2>
        <p className="mb-6 text-gray-600">
          The campaign you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.close();
            }
          }}
          className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}

