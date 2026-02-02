import { useState, useCallback, useEffect } from 'react';

export interface CampaignAnalytics {
  total_actual_sessions: number;
  total_engaged_sessions: number;
  total_time_spent: number; // seconds
}

interface UseCampaignAnalyticsReturn {
  analytics: CampaignAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage campaign analytics data
 */
export function useCampaignAnalytics(campaignId: string): UseCampaignAnalyticsReturn {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!campaignId) {
      // Don't set error if campaignId is empty - just don't fetch
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/${campaignId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      const data: CampaignAnalytics = await response.json();
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      console.error('[useCampaignAnalytics] Error:', err);
      // Don't throw - just set error state so page continues to work
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  // Initial fetch on mount (only if campaignId is provided)
  useEffect(() => {
    if (campaignId) {
      fetchAnalytics();
    }
  }, [campaignId, fetchAnalytics]);

  const refresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refresh,
  };
}

