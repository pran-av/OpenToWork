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

    // Defer widget script loading to improve LCP - load after initial render
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

    // Defer widget loading to avoid blocking LCP
    const loadWidget = () => {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "/widget-loader.js";
        script.async = true;
        script.defer = true;
        script.onload = loadScript;
        document.head.appendChild(script);
      } else {
        // Script already loaded, initialize directly
        loadScript();
      }
    };

    // Use requestIdleCallback to defer widget loading, fallback to setTimeout
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      requestIdleCallback(loadWidget, { timeout: 3000 });
    } else {
      setTimeout(loadWidget, 100);
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

