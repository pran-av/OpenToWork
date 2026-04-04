"use client";

export function LandingFooter() {
  return (
    <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-orange-100 py-4 md:py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 leading-tight sm:leading-normal">
          <p className="font-inter">
            © 2025 - 2026 Pitch Like This. All rights reserved.
          </p>
          <p className="font-inter text-center sm:text-left">
            <a
              href="/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open("/policies/privacy", "_blank", "noopener,noreferrer");
                window.focus();
              }}
              className="text-orange-600 hover:text-orange-700 font-semibold underline"
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
              className="text-orange-600 hover:text-orange-700 font-semibold underline"
            >
              Terms of Service
            </a>
            {" | "}
            Created by{" "}
            <a
              href="https://x.com/pranavdotexe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-semibold underline"
            >
              Pranav
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
