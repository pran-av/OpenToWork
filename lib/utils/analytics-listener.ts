/**
 * Analytics Event Listener
 * Global click listener that captures button clicks with tracking attributes
 * Prevents duplicate events and handles special click cases
 */

import { trackEvent, EventMetadata } from './analytics-tracker';

// Track processed events to prevent duplicates
const processedEvents = new Set<string>();
const PROCESSED_EVENTS_MAX_SIZE = 1000; // Prevent memory leak

/**
 * Check if a link is external (different origin)
 */
function isExternalLink(href: string): boolean {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
    return false;
  }
  
  try {
    const url = new URL(href, window.location.origin);
    return url.origin !== window.location.origin;
  } catch {
    // Invalid URL, treat as internal
    return false;
  }
}

/**
 * Get tracking metadata from element
 */
function getTrackingMetadata(element: HTMLElement): EventMetadata | undefined {
  const trackId = element.getAttribute('data-track-id');
  const trackLocation = element.getAttribute('data-track-location');
  const trackExternal = element.getAttribute('data-track-external');
  
  if (!trackId && !trackLocation) {
    return undefined; // No tracking attributes
  }

  const metadata: EventMetadata = {};

  // Page navigation (step1, step2, step3)
  if (trackLocation) {
    metadata.page_navigation = trackLocation;
  }

  // Button name or text
  if (trackId) {
    metadata.button_name = trackId;
  } else {
    // Fallback to element text content
    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length < 100) {
      metadata.button_name = text;
    }
  }

  // External link detection
  if (element instanceof HTMLAnchorElement && element.href) {
    const isExternal = trackExternal === 'true' || isExternalLink(element.href);
    if (isExternal) {
      metadata.external_link = element.href;
    }
  } else if (element.closest('a')) {
    const linkElement = element.closest('a') as HTMLAnchorElement;
    if (linkElement.href) {
      const isExternal = trackExternal === 'true' || isExternalLink(linkElement.href);
      if (isExternal) {
        metadata.external_link = linkElement.href;
      }
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Generate event key for deduplication
 */
function generateEventKey(element: HTMLElement, metadata?: EventMetadata): string {
  const trackId = element.getAttribute('data-track-id') || '';
  const trackLocation = element.getAttribute('data-track-location') || '';
  const buttonName = metadata?.button_name || '';
  const timestamp = Math.floor(Date.now() / 1000); // Round to seconds for dedup window
  
  return `${trackId}-${trackLocation}-${buttonName}-${timestamp}`;
}

/**
 * Handle click event
 */
function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (!target) return;

  // Find element with tracking attributes (check element and parents)
  let trackedElement: HTMLElement | null = null;
  let current: HTMLElement | null = target;

  while (current) {
    if (
      current.hasAttribute('data-track-id') ||
      current.hasAttribute('data-track-location')
    ) {
      trackedElement = current;
      break;
    }
    current = current.parentElement;
  }

  if (!trackedElement) {
    return; // No tracking attributes found
  }

  // Get tracking metadata
  const metadata = getTrackingMetadata(trackedElement);
  if (!metadata) {
    return; // No valid metadata
  }

  // Generate event key for deduplication
  const eventKey = generateEventKey(trackedElement, metadata);

  // Check if event was already processed (prevent duplicates)
  if (processedEvents.has(eventKey)) {
    return; // Duplicate event, skip
  }

  // Add to processed events
  processedEvents.add(eventKey);

  // Cleanup old processed events to prevent memory leak
  if (processedEvents.size > PROCESSED_EVENTS_MAX_SIZE) {
    const firstKey = processedEvents.values().next().value;
    if (firstKey) {
      processedEvents.delete(firstKey);
    }
  }

  // Track the event
  trackEvent('button_click', metadata);
}

/**
 * Initialize global click listener
 * Should be called once when the app loads
 */
export function initializeAnalyticsListener(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  // Remove existing listener if any (prevent duplicates)
  document.removeEventListener('click', handleClick);
  
  // Add click listener (use capture phase to catch events early)
  document.addEventListener('click', handleClick, true);
}

/**
 * Cleanup analytics listener
 * Should be called on app unmount
 */
export function cleanupAnalyticsListener(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  document.removeEventListener('click', handleClick);
  processedEvents.clear();
}

