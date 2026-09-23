"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to White theme" : "Switch to Black theme"}
      title={isDark ? "Switch to White theme" : "Switch to Black theme"}
      className={`relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer shadow-xs ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      {isDark ? (
        // Sun icon for switching back to White
        <svg
          className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon icon for switching to Black
        <svg
          className="w-4 h-4 text-neutral-700 animate-in spin-in-90 duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
