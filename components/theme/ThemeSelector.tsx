"use client";

import Image from "next/image";
import { useTheme } from "./ThemeProvider";
import { useLocale } from "next-intl";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const isAm = locale === "am";

  return (
    <div
      className="grid grid-cols-3 w-full items-center gap-1.5 rounded-2xl p-1.5 border"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {/* White Option */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
          theme === "light"
            ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/80"
            : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        }`}
      >
        <span className="text-base leading-none">☀️</span>
        <span className="truncate">{isAm ? "ነጭ" : "White"}</span>
        {theme === "light" && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
        )}
      </button>

      {/* Black Option */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
          theme === "dark"
            ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
            : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
        }`}
      >
        <span className="text-base leading-none">🌙</span>
        <span className="truncate">{isAm ? "ጥቁር" : "Black"}</span>
        {theme === "dark" && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
        )}
      </button>

      {/* TAF Logo Theme Option */}
      <button
        type="button"
        onClick={() => setTheme("taf")}
        className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
          theme === "taf"
            ? "bg-gradient-to-r from-amber-600/30 to-orange-600/30 text-amber-200 shadow-sm border border-amber-500/60 ring-1 ring-amber-500/30"
            : "text-neutral-500 hover:text-amber-500 dark:hover:text-amber-300"
        }`}
      >
        <div className="flex items-center justify-center shrink-0">
          <Image
            src="/brand/taf-logo.webp"
            alt="TAF"
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
        <span className="truncate">{isAm ? "ታፍ አርማ" : "TAF Logo"}</span>
        {theme === "taf" && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0 animate-pulse" />
        )}
      </button>
    </div>
  );
}
