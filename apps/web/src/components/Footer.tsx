import React from "react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-white/60 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted">
          © {year} Poppy Journey Planner — test build
        </p>

        <a
          href="https://github.com/Pandanaax"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10 focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring))]/40"
          aria-label="Voir le GitHub de Pandanaax"
        >
          {/* GitHub icon */}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.1c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.73.08-.73 1.21.09 1.85 1.25 1.85 1.25 1.08 1.84 2.83 1.31 3.52 1.01.11-.8.42-1.31.77-1.61-2.66-.3-5.46-1.33-5.46-5.9 0-1.3.47-2.36 1.25-3.19-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.22a11.44 11.44 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.28-1.54 3.29-1.22 3.29-1.22.66 1.65.24 2.88.12 3.18.78.83 1.25 1.89 1.25 3.19 0 4.59-2.8 5.59-5.47 5.89.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"
              clipRule="evenodd"
            />
          </svg>
          <span>github.com/Pandanaax</span>
        </a>
      </div>
    </footer>
  );
}
