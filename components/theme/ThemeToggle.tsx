"use client";

import Image from "next/image";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const label =
    theme === "light"
      ? "Current: White (Click for Black)"
      : theme === "dark"
      ? "Current: Black (Click for TAF Logo Theme)"
      : "Current: TAF Logo Theme (Click for White)";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer shadow-xs ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      {theme === "taf" ? (
        // TAF Logo Theme
        <div className="flex items-center justify-center p-0.5">
          <Image
            src="/brand/taf-logo.webp"
            alt="TAF"
            width={20}
            height={20}
            priority
            className="object-contain drop-shadow-xs"
          />
        </div>
      ) : theme === "dark" ? (
        // Moon icon for Black theme
        <svg
          className="w-4 h-4 text-indigo-300 animate-in spin-in-90 duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // Sun icon for White theme
        <svg
          className="w-4 h-4 text-amber-500 animate-in spin-in-90 duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
