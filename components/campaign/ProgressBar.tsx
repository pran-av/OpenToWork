"use client";

type FlowStage = "summary" | "relevant-work" | "cta";

interface ProgressBarProps {
  currentStage: FlowStage;
}

export default function ProgressBar({ currentStage }: ProgressBarProps) {
  const getProgress = () => {
    switch (currentStage) {
      case "summary":
        return 33.33;
      case "relevant-work":
        return 66.66;
      case "cta":
        return 100;
      default:
        return 0;
    }
  };

  const getProgressText = () => {
    switch (currentStage) {
      case "summary":
        return "you are at first step. 2 more to go!";
      case "relevant-work":
        return "you are at second step. 1 more to go!";
      case "cta":
        return "you are at the final step!";
      default:
        return "";
    }
  };

  return (
    <div className="mb-6">
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-400 transition-all duration-300"
          style={{ width: `${getProgress()}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-gray-600">{getProgressText()}</p>
    </div>
  );
}

