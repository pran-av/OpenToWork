/**
 * Analytics Tracker Utility
 * Handles session creation, event tracking, and heartbeat pings
 * for campaign analytics
 */

import { v7 as uuidv7 } from 'uuid';
import { createHash } from 'crypto';

// Constants
const SESSION_COOKIE_NAME = 'analytics_session_id';
const SESSION_COOKIE_TTL_SECONDS = 30 * 60; // 30 minutes
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
const EVENT_BATCH_SIZE = 10; // Max events per batch (reduced from 50)
const EVENT_FLUSH_INTERVAL_MS = 30 * 1000; // 30 seconds (min) to 60 seconds (max)

// Types
export interface EventMetadata {
  page_navigation?: string; // step1, step2, step3
  button_name?: string;
  external_link?: string;
}

export interface QueuedEvent {
  event_id: string;
  event_type: 'link_open' | 'button_click';
  metadata?: EventMetadata;
  timestamp: string;
}

export interface SessionData {
  session_id: string;
  project_id: string;
  campaign_id: string | null;
}

/**
 * Generate time-sortable UUID (UUIDv7)
 * Uses the uuid package's v7 implementation for proper UUIDv7 format
 */
export function generateUUIDv7(): string {
  return uuidv7();
}

/**
 * Hash user agent string using SHA-256
 * Returns hex string (64 characters)
 */
export function hashUserAgent(ua: string): string {
  if (typeof window === 'undefined') {
    // Server-side: use Node.js crypto
    return createHash('sha256').update(ua).digest('hex');
  }
  
  // Client-side: use Web Crypto API
  // Note: This is async, but we'll handle it synchronously for simplicity
  // In practice, we'll hash on the server side
  return ua; // Placeholder - should hash on server
}

/**
 * Get session ID from cookie
 */
export function getSessionIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Set session ID in cookie
 * Note: This sets a client-side cookie. The actual secure cookie is set by the server.
 */
export function setSessionIdCookie(sessionId: string): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date(Date.now() + SESSION_COOKIE_TTL_SECONDS * 1000);
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Create a new session via API
 */
export async function createSession(projectId: string, userAgent?: string): Promise<SessionData | null> {
  try {
    const userAgentHash = userAgent ? hashUserAgent(userAgent) : undefined;
    
    const response = await fetch('/api/analytics/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        user_agent_hash: userAgentHash,
      }),
    });

    if (!response.ok) {
      // console.error('[Analytics] Failed to create session:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Store session ID in cookie (client-side, for reference)
    if (data.session_id) {
      setSessionIdCookie(data.session_id);
    }
    
    return {
      session_id: data.session_id,
      project_id: projectId,
      campaign_id: data.campaign_id || null,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    // console.error('[Analytics] Error creating session:', error);
    return null;
  }
}

/**
 * Event queue for batching
 */
class EventQueue {
  private queue: QueuedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Add event to queue
   */
  add(event: QueuedEvent) {
    if (typeof window !== 'undefined') {
      // Debug log for event enqueue
      // eslint-disable-next-line no-console
      // console.log('[Analytics] Queuing event', {
      //   type: event.event_type,
      //   hasSessionId: !!this.sessionId,
      //   queueSizeBefore: this.queue.length,
      // });
    }

    this.queue.push(event);
    
    // Auto-flush if batch size reached
    if (this.queue.length >= EVENT_BATCH_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush after interval
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, EVENT_FLUSH_INTERVAL_MS);
    }
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      // console.log('[Analytics] Flush called', {
      //   queueSize: this.queue.length,
      //   hasSessionId: !!this.sessionId,
      // });
    }

    if (this.queue.length === 0 || !this.sessionId) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      return;
    }

    const eventsToSend = [...this.queue];
    this.queue = [];
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          events: eventsToSend,
        }),
      });

      if (!response.ok) {
        // console.error('[Analytics] Failed to send events:', response.statusText);
        // Re-queue events on failure (up to batch size)
        if (eventsToSend.length <= EVENT_BATCH_SIZE) {
          this.queue.unshift(...eventsToSend);
        }
      }
    } catch (error) {
      // console.error('[Analytics] Error sending events:', error);
      // Re-queue events on failure (up to batch size)
      if (eventsToSend.length <= EVENT_BATCH_SIZE) {
        this.queue.unshift(...eventsToSend);
      }
    }
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }
}

// Global event queue instance
const eventQueue = new EventQueue();

/**
 * Track an event (queued for batching)
 */
export function trackEvent(
  eventType: 'link_open' | 'button_click',
  metadata?: EventMetadata
): void {
  const sessionId = getSessionIdFromCookie();
  if (!sessionId) {
    // console.warn('[Analytics] No session ID found, event not tracked');
    return;
  }

  eventQueue.setSessionId(sessionId);
  
  const event: QueuedEvent = {
    event_id: generateUUIDv7(),
    event_type: eventType,
    metadata,
    timestamp: new Date().toISOString(),
  };

  eventQueue.add(event);
}

/**
 * Flush pending events immediately
 * Called on page unload or visibility change
 */
export function flushEvents(): void {
  eventQueue.flush();
}

/**
 * Heartbeat manager
 */
class HeartbeatManager {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;
  private isActive: boolean = false;
  private lastPingTime: number = 0;

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Start heartbeat pings
   */
  start(): void {
    if (this.intervalId) {
      return; // Already running
    }

    this.isActive = true;
    this.lastPingTime = Date.now();
    
    // Send initial ping
    this.sendHeartbeat();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      if (this.isActive && document.visibilityState === 'visible') {
        this.sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat pings
   * Clears interval and sends final heartbeat if active
   */
  stop(): void {
    // Flush accumulated time before stopping (if active)
    if (this.isActive) {
      this.flushHeartbeat();
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
  }

  /**
   * Flush accumulated time increment immediately
   * Used when stopping heartbeat (tab hidden, window blur, pagehide)
   */
  flushHeartbeat(): void {
    if (!this.sessionId || !this.isActive) {
      return;
    }

    const now = Date.now();
    const timeIncrement = Math.floor((now - this.lastPingTime) / 1000); // seconds
    
    if (timeIncrement <= 0) {
      return;
    }

    // Update lastPingTime before sending (to prevent double-counting)
    this.lastPingTime = now;

    // Send heartbeat immediately (fire and forget)
    this.sendHeartbeatSync(timeIncrement);
  }

  /**
   * Send heartbeat ping
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.sessionId || !this.isActive) {
      return;
    }

    const now = Date.now();
    const timeIncrement = Math.floor((now - this.lastPingTime) / 1000); // seconds
    
    if (timeIncrement <= 0) {
      return;
    }

    this.lastPingTime = now;

    await this.sendHeartbeatSync(timeIncrement);
  }

  /**
   * Send heartbeat to server (synchronous wrapper)
   */
  private async sendHeartbeatSync(timeIncrement: number): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      const response = await fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          time_increment: timeIncrement,
        }),
      });

      if (!response.ok) {
        // console.error('[Analytics] Failed to send heartbeat:', response.statusText);
      }
    } catch (error) {
      // console.error('[Analytics] Error sending heartbeat:', error);
    }
  }
}

// Global heartbeat manager instance
const heartbeatManager = new HeartbeatManager();

/**
 * Start heartbeat pings
 */
export function startHeartbeat(sessionId: string): void {
  heartbeatManager.setSessionId(sessionId);
  heartbeatManager.start();
}

/**
 * Stop heartbeat pings
 */
export function stopHeartbeat(): void {
  heartbeatManager.stop();
}

/**
 * Stop heartbeat and flush accumulated time
 * Used when tab/window loses focus or becomes hidden
 * This is an alias for stopHeartbeat() for semantic clarity
 */
export function stopHeartbeatWithFlush(): void {
  heartbeatManager.stop();
}

/**
 * Ensure valid session exists (check and renew if needed)
 * Returns true if session is valid, false if new session was created
 */
export async function ensureValidSession(projectId: string): Promise<boolean> {
  const existingSessionId = getSessionIdFromCookie();
  
  // If no cookie, create new session
  if (!existingSessionId) {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
    const session = await createSession(projectId, userAgent);
    
    if (session?.session_id) {
      heartbeatManager.setSessionId(session.session_id);
      eventQueue.setSessionId(session.session_id);
      return false; // New session created
    }
    return false;
  }
  
  // Cookie exists, assume session is valid (server will handle expiry)
  heartbeatManager.setSessionId(existingSessionId);
  eventQueue.setSessionId(existingSessionId);
  return true; // Existing session
}

/**
 * Start heartbeat using session ID from cookie
 * Used when tab/window gains focus or becomes visible
 * This restarts the heartbeat with a fresh baseline
 * Automatically creates new session if cookie expired
 */
export async function startHeartbeatFromCookie(projectId: string): Promise<void> {
  const sessionId = getSessionIdFromCookie();
  if (sessionId) {
    heartbeatManager.setSessionId(sessionId);
    heartbeatManager.start();
  } else {
    // Cookie expired, create new session and start heartbeat
    await ensureValidSession(projectId);
    const newSessionId = getSessionIdFromCookie();
    if (newSessionId) {
      heartbeatManager.setSessionId(newSessionId);
      heartbeatManager.start();
    }
  }
}

/**
 * Initialize analytics tracking
 * Should be called when page loads and visibility is 'visible'
 */
export async function initializeAnalytics(projectId: string): Promise<SessionData | null> {
  // Check if session already exists
  const existingSessionId = getSessionIdFromCookie();
  if (existingSessionId) {
    heartbeatManager.setSessionId(existingSessionId);
    eventQueue.setSessionId(existingSessionId);
    startHeartbeat(existingSessionId);
    
    // Return existing session data (we'll need to fetch campaign_id from API if needed)
    return {
      session_id: existingSessionId,
      project_id: projectId,
      campaign_id: null, // Will be updated by API
    };
  }

  // Create new session
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  const session = await createSession(projectId, userAgent);
  
  if (session?.session_id) {
    heartbeatManager.setSessionId(session.session_id);
    eventQueue.setSessionId(session.session_id);
    startHeartbeat(session.session_id);
    
    // Track initial link_open event
    trackEvent('link_open');
  }
  
  return session;
}

/**
 * Cleanup analytics tracking
 * Should be called on component unmount
 */
export function cleanupAnalytics(): void {
  // Flush pending events
  flushEvents();
  
  // Stop heartbeat
  stopHeartbeat();
}

