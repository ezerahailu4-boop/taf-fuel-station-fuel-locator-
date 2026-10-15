"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import "@/types/telegram";

/** Syncs the user's selected White/Black theme with Telegram WebApp native title bar & background. */
export function ThemeSync() {
  const { theme } = useTheme();

  useEffect(() => {
    try {
      const tg = typeof window !== "undefined" ? (window.Telegram?.WebApp as any) : undefined;
      if (!tg) return;

      if (typeof tg.isVersionAtLeast === "function" && !tg.isVersionAtLeast("6.1")) {
        return;
      }

      if (theme === "taf") {
        tg.setHeaderColor?.("#1e1812");
        tg.setBackgroundColor?.("#14110e");
      } else if (theme === "dark") {
        tg.setHeaderColor?.("#171a21");
        tg.setBackgroundColor?.("#0f1115");
      } else {
        tg.setHeaderColor?.("#ffffff");
        tg.setBackgroundColor?.("#fafafa");
      }
    } catch {
      // Silently ignore if unsupported
    }
  }, [theme]);

  return null;
}
