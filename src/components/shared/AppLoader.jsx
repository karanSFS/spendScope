import React from "react";

/**
 * Full-screen branded loader shown while the persisted app state hydrates.
 * Pure markup + CSS (no hooks / redux) so it renders safely before providers are ready.
 */
export default function AppLoader({ label = "Getting your finances ready" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading SpendScope"
      data-testid="app-loader"
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6 text-center bg-[var(--home-background)] text-[var(--home-text)]"
    >
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--home-accent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full blur-3xl opacity-20"
        style={{ background: "var(--home-income)" }}
      />

      <div className="relative flex flex-col items-center ss-fade-up">
        {/* Logo with orbit ring */}
        <div className="relative h-28 w-28 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="ss-pulse-ring absolute inset-0 rounded-full border-2"
            style={{ borderColor: "var(--home-accent)" }}
          />
          <span
            aria-hidden="true"
            className="ss-pulse-ring absolute inset-0 rounded-full border"
            style={{ borderColor: "var(--home-accent)", animationDelay: "0.9s" }}
          />
          <span
            aria-hidden="true"
            className="ss-spin absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 230deg, var(--home-accent) 330deg, transparent 360deg)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
            }}
          />
          <div className="relative h-20 w-20 rounded-[28px] bg-[var(--home-card)] border border-[var(--home-border)] shadow-lg flex items-center justify-center">
            <svg
              viewBox="0 0 36 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-11 w-11"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="2"
                width="23"
                height="11"
                rx="3"
                fill="var(--home-accent)"
                fillOpacity="0.45"
                stroke="white"
                strokeWidth="1"
              />
              <rect x="2" y="7" width="32" height="23" rx="6" fill="var(--home-accent)" />
              <path
                d="M3 13.5C3 11 5 9 8 9H28C31 9 33 11 33 13.5"
                stroke="white"
                strokeOpacity="0.3"
                strokeWidth="1.2"
              />
              <path
                d="M23 13.5H32.5C33.6 13.5 34.5 14.4 34.5 15.5V21.5C34.5 22.6 33.6 23.5 32.5 23.5H23C21.6 23.5 20.5 22.4 20.5 21V16C20.5 14.6 21.6 13.5 23 13.5Z"
                fill="var(--home-accent)"
                stroke="white"
                strokeWidth="1.2"
              />
              <circle cx="26.5" cy="18.5" r="1.8" fill="white" />
            </svg>
          </div>
        </div>

        {/* Brand */}
        <h1 className="mt-8 font-display text-3xl sm:text-4xl tracking-tight">
          Spend<span style={{ color: "var(--home-accent)" }}>Scope</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--home-text-secondary)]">{label}</p>

        {/* Bouncing coins */}
        <div className="mt-6 flex items-end gap-2.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ss-coin h-3.5 w-3.5 rounded-full"
              style={{
                animationDelay: `${i * 0.18}s`,
                background:
                  i === 1 ? "var(--home-income)" : "var(--home-accent)",
                boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </div>

        {/* Progress sweep */}
        <div
          aria-hidden="true"
          className="mt-7 h-1.5 w-48 overflow-hidden rounded-full bg-[var(--home-track)]"
        >
          <div
            className="ss-progress h-full w-2/5 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--home-accent), var(--home-income))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
