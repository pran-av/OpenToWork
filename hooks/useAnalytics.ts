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
  stopHeartbeatWithFlush,
  startHeartbeatFromCookie,
  ensureValidSession,
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

  // Handle visibility changes and focus/blur (pause/resume heartbeat)
  useEffect(() => {
    if (!enabled || !isInitialized) {
      return;
    }

    // Detect if device is mobile (simplified check)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden - flush events and heartbeat immediately
        flushEvents();
        stopHeartbeatWithFlush(); // Flushes accumulated time and stops heartbeat
      } else if (document.visibilityState === 'visible') {
        // Page visible again - ensure valid session and restart heartbeat
        await ensureValidSession(projectId);
        await startHeartbeatFromCookie(projectId);
      }
    };

    const handlePageHide = () => {
      // Page is unloading - flush events and heartbeat immediately
      flushEvents();
      stopHeartbeatWithFlush(); // Flushes accumulated time and stops heartbeat
    };

    const handlePageShow = async () => {
      // Page shown again (mobile) - ensure valid session and restart heartbeat
      await ensureValidSession(projectId);
      await startHeartbeatFromCookie(projectId);
    };

    // Desktop-only: window focus/blur events
    const handleWindowBlur = () => {
      if (!isMobile) {
        // Window lost focus (desktop) - flush heartbeat and stop
        stopHeartbeatWithFlush(); // Flushes accumulated time and stops heartbeat
      }
    };

    const handleWindowFocus = async () => {
      if (!isMobile) {
        // Window gained focus (desktop) - ensure valid session and restart heartbeat
        await ensureValidSession(projectId);
        await startHeartbeatFromCookie(projectId);
      }
    };

    // Always listen to visibilitychange (works for both desktop and mobile)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mobile: use pagehide/pageshow
    if (isMobile) {
      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('pageshow', handlePageShow);
    } else {
      // Desktop: use focus/blur
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isMobile) {
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
      } else {
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [enabled, isInitialized, projectId]);

  // Periodic session validation (every 5 minutes)
  useEffect(() => {
    if (!enabled || !isInitialized) {
      return;
    }

    const validateSession = async () => {
      await ensureValidSession(projectId);
    };

    // Check immediately, then every 5 minutes
    validateSession();
    const intervalId = setInterval(validateSession, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, isInitialized, projectId]);

  return {
    session,
    isInitialized,
  };
}

