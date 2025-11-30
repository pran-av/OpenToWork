"use client";

import { useEffect, useRef } from "react";

interface WidgetProps {
  widgetId: string;
}

export default function Widget({ widgetId }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !widgetId || initializedRef.current) return;

    // Load widget script if not already loaded
    const scriptId = "otw-widget-loader";
    const loadScript = () => {
      if (window.OpenToWorkWidget && containerRef.current) {
        // Check if already initialized
        if (
          containerRef.current.shadowRoot ||
          containerRef.current.hasAttribute("data-otw-initialized")
        ) {
          return;
        }
        window.OpenToWorkWidget.init(containerRef.current, widgetId);
        initializedRef.current = true;
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "/widget-loader.js";
      script.async = true;
      script.onload = loadScript;
      document.head.appendChild(script);
    } else {
      // Script already loaded, initialize directly
      loadScript();
    }
  }, [widgetId]);

  return <div ref={containerRef} data-widget-id={widgetId} />;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    OpenToWorkWidget?: {
      init: (element: HTMLElement, widgetId: string) => void;
      version: string;
    };
  }
}

