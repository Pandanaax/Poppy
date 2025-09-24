import React from "react";

// Vite resolves the final (hashed) URL — no proxy/404 issues
const logoUrl = new URL("../assets/logo.jpg", import.meta.url).href;

export function Header() {
  return (
    <div className="sticky top-0 z-20 border-b border-white/60 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-6xl h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Keep a fixed-height box; let the image keep its aspect ratio */}
          <div className="h-10 md:h-12 flex items-center">
            <img
              src={logoUrl}
              alt="Poppy logo"
              className="h-full w-auto object-contain"
            />
          </div>

          <div>
            <div className="font-semibold leading-tight">Poppy Journey Planner</div>
            <div className="text-xs text-muted -mt-0.5">Cheapest multi-leg planning</div>
          </div>
        </div>

        <a
          href="https://poppy.red/"
          className="text-sm text-red-700 hover:text-red-800 font-medium"
          target="_blank"
          rel="noreferrer"
        >
          Poppy API
        </a>
      </div>
    </div>
  );
}
