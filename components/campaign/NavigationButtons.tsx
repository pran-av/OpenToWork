"use client";

import { X, ChevronLeft } from "lucide-react";
import Widget from "@/components/campaign/Widget";

type FlowStage = "summary" | "relevant-work" | "cta";

interface NavigationButtonsProps {
  stage: FlowStage;
  onPrevious: () => void;
  onClose: () => void;
  widgetId?: string | null;
}

export default function NavigationButtons({
  stage,
  onPrevious,
  onClose,
  widgetId,
}: NavigationButtonsProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      {/* Status Badge - Available for Hire Widget */}
      {widgetId ? (
        <Widget widgetId={widgetId} />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-700">Available for Hire</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4">
        {stage !== "summary" && (
          <button
            onClick={onPrevious}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>previous</span>
          </button>
        )}
        {stage !== "summary" && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X className="h-4 w-4" />
            <span>close</span>
          </button>
        )}
      </div>
    </div>
  );
}

