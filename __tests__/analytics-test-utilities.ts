/**
 * Analytics Testing Utilities
 * Helper functions for testing analytics functionality
 */

/**
 * Generate a test session ID (UUIDv7 format)
 */
export function generateTestSessionId(): string {
  // Simple UUIDv4 for testing (replace with actual UUIDv7 in production)
  return `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a test event ID (UUIDv7 format)
 */
export function generateTestEventId(): string {
  return `test-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a test session payload
 */
export function createTestSessionPayload(projectId: string, userAgentHash?: string) {
  return {
    project_id: projectId,
    user_agent_hash: userAgentHash || 'test-user-agent-hash',
  };
}

/**
 * Create a test event payload
 */
export function createTestEventPayload(
  sessionId: string,
  eventType: 'link_open' | 'button_click',
  metadata?: {
    page_navigation?: string;
    button_name?: string;
    external_link?: string;
  }
) {
  return {
    session_id: sessionId,
    events: [
      {
        event_id: generateTestEventId(),
        event_type: eventType,
        metadata: metadata || null,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Create a test heartbeat payload
 */
export function createTestHeartbeatPayload(sessionId: string, timeIncrement: number = 30) {
  return {
    session_id: sessionId,
    time_increment: timeIncrement,
  };
}

/**
 * Wait for a specified duration (for testing time-based behavior)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock fetch for testing API routes
 */
export function createMockFetch(responses: Record<string, any>) {
  return async (url: string, options?: RequestInit) => {
    const responseKey = url.split('?')[0]; // Remove query params
    
    if (responses[responseKey]) {
      const response = responses[responseKey];
      return {
        ok: response.ok !== false,
        status: response.status || 200,
        json: async () => response.data || {},
        text: async () => JSON.stringify(response.data || {}),
      } as Response;
    }
    
    throw new Error(`No mock response for ${responseKey}`);
  };
}

/**
 * Verify session cookie properties
 */
export function verifySessionCookie(cookie: string): {
  isValid: boolean;
  hasHttpOnly: boolean;
  hasSecure: boolean;
  hasSameSite: boolean;
  maxAge?: number;
} {
  // This is a simplified check - actual implementation would parse Set-Cookie header
  return {
    isValid: cookie.includes('otw_analytics_session'),
    hasHttpOnly: cookie.includes('HttpOnly'),
    hasSecure: cookie.includes('Secure'),
    hasSameSite: cookie.includes('SameSite'),
  };
}

/**
 * Calculate expected time spent from heartbeats
 */
export function calculateExpectedTimeSpent(heartbeatCount: number, intervalSeconds: number = 30): number {
  return heartbeatCount * intervalSeconds;
}

/**
 * Format time for display (matches AnalyticsCards format)
 */
export function formatTimeSpent(seconds: number): string {
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

/**
 * Verify event batch size is within limits
 */
export function verifyBatchSize(events: any[]): { isValid: boolean; size: number; maxSize: number } {
  const maxSize = 60;
  return {
    isValid: events.length <= maxSize,
    size: events.length,
    maxSize,
  };
}

/**
 * Verify event metadata structure
 */
export function verifyEventMetadata(metadata: any): {
  isValid: boolean;
  hasPageNavigation: boolean;
  hasButtonName: boolean;
  hasExternalLink: boolean;
} {
  return {
    isValid: typeof metadata === 'object' && metadata !== null,
    hasPageNavigation: typeof metadata?.page_navigation === 'string',
    hasButtonName: typeof metadata?.button_name === 'string',
    hasExternalLink: typeof metadata?.external_link === 'boolean',
  };
}

/**
 * Simulate tab visibility change
 */
export function simulateVisibilityChange(visibility: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    writable: true,
    value: visibility,
  });
  
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: visibility === 'hidden',
  });
  
  document.dispatchEvent(new Event('visibilitychange'));
}

/**
 * Simulate page hide
 */
export function simulatePageHide() {
  window.dispatchEvent(new Event('pagehide'));
}

/**
 * Create test analytics data for dashboard testing
 */
export function createTestAnalyticsData(overrides?: Partial<{
  total_actual_sessions: number;
  total_engaged_sessions: number;
  total_time_spent: number;
}>): {
  total_actual_sessions: number;
  total_engaged_sessions: number;
  total_time_spent: number;
} {
  return {
    total_actual_sessions: overrides?.total_actual_sessions ?? 10,
    total_engaged_sessions: overrides?.total_engaged_sessions ?? 5,
    total_time_spent: overrides?.total_time_spent ?? 3600, // 1 hour
  };
}

