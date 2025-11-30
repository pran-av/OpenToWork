"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function CampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const campaignId = params.id as string;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Campaign Not Found
        </h1>
        <p className="mb-6 text-gray-600">
          The campaign with ID <code className="rounded bg-gray-100 px-2 py-1 text-sm">{campaignId}</code> could not be found or is no longer available.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => window.close()}
            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

