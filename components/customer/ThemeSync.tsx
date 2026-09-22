"use client";

import { useEffect } from "react";
import "@/types/telegram";

/** Follows Telegram's light/dark scheme inside the Mini App; on the web the CSS prefers-color-scheme rule applies. */
export function ThemeSync() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.colorScheme) return;
    const apply = () => document.documentElement.setAttribute("data-theme", tg.colorScheme === "dark" ? "dark" : "light");
    apply();
    tg.onEvent?.("themeChanged", apply);
    return () => tg.offEvent?.("themeChanged", apply);
  }, []);
  return null;
}
