"use client";

import { useTheme } from "./ThemeProvider";
import { useLocale } from "next-intl";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const isAm = locale === "am";

  return (
    <div className="flex w-full items-center gap-2 rounded-2xl p-1.5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      {/* White Option */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
          theme === "light"
            ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/80"
            : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        }`}
      >
        <span className="text-base">☀️</span>
        <span>{isAm ? "ነጭ (White)" : "White (Light)"}</span>
        {theme === "light" && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
        )}
      </button>

      {/* Black Option */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
          theme === "dark"
            ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
            : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        }`}
      >
        <span className="text-base">🌙</span>
        <span>{isAm ? "ጥቁር (Black)" : "Black (Dark)"}</span>
        {theme === "dark" && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
        )}
      </button>
    </div>
  );
}
