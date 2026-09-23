"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import "@/types/telegram";

/** Syncs the user's selected White/Black theme with Telegram WebApp native title bar & background. */
export function ThemeSync() {
  const { theme } = useTheme();

  useEffect(() => {
    const tg = typeof window !== "undefined" ? (window.Telegram?.WebApp as any) : undefined;
    if (!tg) return;

    if (theme === "dark") {
      tg.setHeaderColor?.("#171a21");
      tg.setBackgroundColor?.("#0f1115");
    } else {
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#fafafa");
    }
  }, [theme]);

  return null;
}
