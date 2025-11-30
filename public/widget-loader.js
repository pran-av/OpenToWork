/**
 * OpenToWork Widget Loader
 * MIT License
 * 
 * This script loads and renders the OpenToWork widget on client websites.
 * It uses Shadow DOM to isolate the widget from the host page's CSS.
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_API_BASE = window.location.origin;
  const WIDGET_VERSION = '1.0.0';

  /**
   * Sanitize HTML to prevent XSS
   */
  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Create widget styles
   */
  function createWidgetStyles(isActive, designAttributes) {
    const primaryColor = designAttributes?.color_primary || '#0066cc';
    const secondaryColor = designAttributes?.color_secondary || '#FFFFFF';
    const customCSS = designAttributes?.custom_css || '';

    const baseStyles = `
      .otw-widget-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .otw-widget-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 50px;
        border: 1px solid #000;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-sizing: border-box;
        text-decoration: none;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      .otw-widget-button:focus {
        outline: 2px solid ${primaryColor};
        outline-offset: 2px;
      }
      
      .otw-widget-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .otw-widget-button.active {
        background-color: ${secondaryColor};
        color: #000;
        border-color: #000;
      }
      
      .otw-widget-button.active .otw-widget-status-dot {
        background-color: #22c55e;
        animation: otw-blink 2s infinite;
      }
      
      .otw-widget-button.inactive {
        background-color: #9ca3af;
        color: #000;
        border-color: #6b7280;
        cursor: not-allowed;
        opacity: 0.8;
      }
      
      .otw-widget-button.inactive .otw-widget-status-dot {
        background-color: #6b7280;
      }
      
      /* Tag style (for status badges) */
      .otw-widget-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        background-color: #ffffff;
        font-weight: 500;
        font-size: 14px;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      .otw-widget-tag .otw-widget-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .otw-widget-tag.active .otw-widget-status-dot {
        background-color: #22c55e;
        animation: otw-blink 2s infinite;
      }
      
      .otw-widget-tag.inactive .otw-widget-status-dot {
        background-color: #6b7280;
      }
      
      .otw-widget-tag .otw-widget-text {
        color: #374151;
      }
      
      @keyframes otw-blink {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      ${customCSS}
    `;
    
    return baseStyles;
  }

  /**
   * Create widget HTML
   */
  function createWidgetHTML(widgetText, isActive, assetType) {
    const statusClass = isActive ? 'active' : 'inactive';
    const displayText = sanitizeHTML(widgetText || (isActive ? 'Available for Hire' : 'Fully Booked'));
    
    // Tag style (for status badges)
    if (assetType === 'status_tag') {
      return `
        <div class="otw-widget-tag ${statusClass}" aria-label="${displayText}">
          <span class="otw-widget-status-dot" aria-hidden="true"></span>
          <span class="otw-widget-text">${displayText}</span>
        </div>
      `;
    }
    
    // Button style (default)
    return `
      <button class="otw-widget-button ${statusClass}" type="button" aria-label="${displayText}">
        <span class="otw-widget-status-dot" aria-hidden="true"></span>
        <span class="otw-widget-text">${displayText}</span>
      </button>
    `;
  }

  /**
   * Initialize widget
   */
  function initWidget(element, widgetId) {
    if (!element || !widgetId) {
      console.error('OpenToWork Widget: Missing element or widget ID');
      return;
    }

    // Check if widget is already initialized (has shadow root or data attribute)
    if (element.shadowRoot || element.hasAttribute('data-otw-initialized')) {
      return; // Already initialized, skip
    }

    // Mark as initialized to prevent re-initialization
    element.setAttribute('data-otw-initialized', 'true');

    // Fetch widget configuration
    fetch(`${WIDGET_API_BASE}/api/widgets/${widgetId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Widget API error: ${response.status}`);
        }
        return response.json();
      })
      .then(config => {
        const { is_active, widget_text, destination_url, design } = config;

        // Check again before creating shadow root (in case it was created during fetch)
        if (element.shadowRoot) {
          return; // Shadow root already exists
        }

        // Create Shadow DOM
        const shadowRoot = element.attachShadow({ mode: 'closed' });
        
        // Create container
        const container = document.createElement('div');
        container.className = 'otw-widget-container';
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = createWidgetStyles(is_active, design);
        shadowRoot.appendChild(style);
        
        // Add widget HTML
        const assetType = design?.asset_type || 'default_button';
        container.innerHTML = createWidgetHTML(widget_text, is_active, assetType);
        shadowRoot.appendChild(container);
        
        // Add click handler for active widgets (only for buttons, not tags)
        if (is_active && destination_url && assetType === 'default_button') {
          const button = container.querySelector('.otw-widget-button');
          if (button) {
            button.addEventListener('click', function(e) {
              e.preventDefault();
              window.open(destination_url, '_blank', 'noopener,noreferrer');
            });
          }
        }
      })
      .catch(error => {
        console.error('OpenToWork Widget: Failed to load widget', error);
        // Show error state (optional) - only if shadow root doesn't exist
        if (!element.shadowRoot) {
          try {
            const shadowRoot = element.attachShadow({ mode: 'closed' });
            const container = document.createElement('div');
            container.className = 'otw-widget-container';
            container.innerHTML = '<div style="color: #ef4444; font-size: 12px;">Widget unavailable</div>';
            shadowRoot.appendChild(container);
          } catch (e) {
            // Shadow root already exists or other error, skip error display
            console.warn('OpenToWork Widget: Could not display error state', e);
          }
        }
        // Remove initialization flag on error so it can retry if needed
        element.removeAttribute('data-otw-initialized');
      });
  }

  /**
   * Initialize all widgets on page load
   */
  function initializeWidgets() {
    // Find all widget containers
    const widgetContainers = document.querySelectorAll('[data-widget-id]');
    
    widgetContainers.forEach(element => {
      const widgetId = element.getAttribute('data-widget-id');
      if (widgetId) {
        initWidget(element, widgetId);
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidgets);
  } else {
    initializeWidgets();
  }

  // Export for manual initialization if needed
  window.OpenToWorkWidget = {
    init: initWidget,
    version: WIDGET_VERSION
  };

})();

