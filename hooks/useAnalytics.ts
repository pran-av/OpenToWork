/**
 * useAnalytics Hook
 * React hook for managing analytics tracking in campaign flow
 * Handles session initialization, event tracking, and cleanup
 */

import { useEffect, useRef, useState } from 'react';
import {
  initializeAnalytics,
  cleanupAnalytics,
  flushEvents,
  SessionData,
} from '@/lib/utils/analytics-tracker';
import {
  initializeAnalyticsListener,
  cleanupAnalyticsListener,
} from '@/lib/utils/analytics-listener';

interface UseAnalyticsOptions {
  projectId: string;
  enabled?: boolean; // Allow disabling analytics
}

interface UseAnalyticsReturn {
  session: SessionData | null;
  isInitialized: boolean;
}

/**
 * Hook for analytics tracking
 * Initializes session and event listeners when component mounts
 * Cleans up on unmount
 */
export function useAnalytics({
  projectId,
  enabled = true,
}: UseAnalyticsOptions): UseAnalyticsReturn {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || initializedRef.current) {
      return;
    }

    // Only initialize when DOM is ready and page is visible
    const initialize = async () => {
      // Wait for DOM to be ready
      if (typeof window === 'undefined' || document.readyState === 'loading') {
        return;
      }

      // Check visibility state
      if (document.visibilityState !== 'visible') {
        // Wait for visibility change
        const handleVisibilityChange = async () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            await doInitialize();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return;
      }

      await doInitialize();
    };

    const doInitialize = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        // Initialize global click listener
        initializeAnalyticsListener();

        // Initialize analytics session
        const sessionData = await initializeAnalytics(projectId);
        setSession(sessionData);
        setIsInitialized(true);
      } catch (error) {
        console.error('[useAnalytics] Error initializing analytics:', error);
      }
    };

    // Initialize immediately if DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initialize();
    } else {
      // Wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', initialize);
    }

    // Cleanup function
    return () => {
      if (initializedRef.current) {
        // Flush pending events before cleanup
        flushEvents();
        
        // Cleanup analytics
        cleanupAnalytics();
        cleanupAnalyticsListener();
        
        initializedRef.current = false;
        setIsInitialized(false);
      }
    };
  }, [projectId, enabled]);

  // Handle visibility changes (pause/resume heartbeat)
  useEffect(() => {
    if (!enabled || !isInitialized) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden - flush events immediately
        flushEvents();
      }
    };

    const handlePageHide = () => {
      // Page is unloading - flush events immediately
      flushEvents();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, isInitialized]);

  return {
    session,
    isInitialized,
  };
}

