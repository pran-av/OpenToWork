"use client";

import { landingTheme } from "./landing-tokens";

export function LandingFooter() {
  return (
    <footer
      className="relative z-10 border-t py-4 md:py-6 backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(255, 251, 242, 0.95)",
        borderColor: "#E8E4DC",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm leading-tight sm:leading-normal">
          <p className="font-inter" style={{ color: landingTheme.muted }}>
            © 2025 - 2026 Pitch Like This. All rights reserved.
          </p>
          <p className="font-inter text-center sm:text-left" style={{ color: landingTheme.muted }}>
            <a
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open("/policies/privacy", "_blank", "noopener,noreferrer");
                window.focus();
              }}
              className="font-semibold underline hover:opacity-80"
              style={{ color: landingTheme.brown }}
            >
              Privacy Policy
            </a>
            {" | "}
            <a
              href="/policies/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open("/policies/terms-of-service", "_blank", "noopener,noreferrer");
                window.focus();
              }}
              className="font-semibold underline hover:opacity-80"
              style={{ color: landingTheme.brown }}
            >
              Terms of Service
            </a>
            {" | "}
            Created by{" "}
            <a
              href="https://x.com/pranavdotexe"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:opacity-80"
              style={{ color: landingTheme.brown }}
            >
              Pranav
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
