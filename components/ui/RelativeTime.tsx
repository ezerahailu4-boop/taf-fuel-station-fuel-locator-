"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/time";

/** Localized "5 minutes ago". Re-renders every 30s so it never lies about age. */
export function RelativeTime({ value }: { value: string | Date }) {
  const t = useTranslations("time");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const r = relativeTime(value, now);
  const text =
    r.unit === "justNow" ? t("justNow") : r.unit === "minutes" ? t("minutesAgo", { count: r.value }) : r.unit === "hours" ? t("hoursAgo", { count: r.value }) : t("daysAgo", { count: r.value });
  const iso = new Date(value).toISOString();
  return <time dateTime={iso} title={new Date(value).toLocaleString()}>{text}</time>;
}
