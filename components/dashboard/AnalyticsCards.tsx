'use client';

import { CampaignAnalytics } from '@/hooks/useCampaignAnalytics';

interface AnalyticsCardsProps {
  analytics: CampaignAnalytics | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Formats seconds into a human-readable time string
 * Examples: "5m 30s", "1h 15m", "45s"
 */
function formatTimeSpent(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  if (remainingSeconds > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m`;
}

export default function AnalyticsCards({ analytics, isLoading, error }: AnalyticsCardsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
        <p className="text-sm text-red-800 dark:text-red-300">Error loading analytics: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse dark:bg-zinc-900 dark:border-zinc-800"
          >
            <div className="h-4 bg-gray-200 rounded w-24 mb-3 dark:bg-zinc-800"></div>
            <div className="h-8 bg-gray-200 rounded w-16 dark:bg-zinc-800"></div>
          </div>
        ))}
      </div>
    );
  }

  const actualSessions = analytics?.total_actual_sessions ?? 0;
  const engagedSessions = analytics?.total_engaged_sessions ?? 0;
  const timeSpent = analytics?.total_time_spent ?? 0;
  
  // Calculate percentage of engaged sessions relative to actual sessions
  const engagementPercentage = actualSessions > 0 
    ? ((engagedSessions / actualSessions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Actual Sessions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-400">Total Actual Sessions</h3>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-zinc-50">{actualSessions.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1 dark:text-zinc-500">
          Sessions with 10+ seconds of activity
        </p>
      </div>

      {/* Percentage of Sessions Engaged */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-400">Sessions Engaged</h3>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-zinc-50">{engagementPercentage}%</p>
        <p className="text-xs text-gray-500 mt-1 dark:text-zinc-500">
          {engagedSessions.toLocaleString()} of {actualSessions.toLocaleString()} actual sessions
        </p>
      </div>

      {/* Total Time Spent */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-400">Total Time Spent</h3>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-zinc-50">{formatTimeSpent(timeSpent)}</p>
        <p className="text-xs text-gray-500 mt-1 dark:text-zinc-500">
          Cumulative active viewing time
        </p>
      </div>
    </div>
  );
}

