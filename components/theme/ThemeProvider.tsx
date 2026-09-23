"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import "@/types/telegram";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default is 'light' (white) as requested
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("taf_theme");
      if (stored === "dark" || stored === "light") {
        setThemeState(stored);
        applyTheme(stored);
      } else {
        // Default to White (Light)
        setThemeState("light");
        applyTheme("light");
      }
    } catch {
      applyTheme("light");
    }
  }, []);

  function applyTheme(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Sync Telegram WebApp native title bar & background colors
    const tg = typeof window !== "undefined" ? (window.Telegram?.WebApp as any) : undefined;
    if (tg) {
      if (next === "dark") {
        tg.setHeaderColor?.("#171a21");
        tg.setBackgroundColor?.("#0f1115");
      } else {
        tg.setHeaderColor?.("#ffffff");
        tg.setBackgroundColor?.("#fafafa");
      }
    }
  }

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem("taf_theme", next);
    } catch {}
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback if used outside ThemeProvider
    return {
      theme: "light" as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
    };
  }
  return ctx;
}
