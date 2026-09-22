export type RelativeUnit = "justNow" | "minutes" | "hours" | "days";
export interface RelativeTime {
  unit: RelativeUnit;
  value: number;
}

/**
 * Pure relative-time bucketing. The UI maps this to localized strings:
 *   time.justNow / time.minutesAgo / time.hoursAgo / time.daysAgo  (ICU plurals)
 * "Just now" (<1 min), "N minutes ago", "N hours ago", "N days ago".
 */
export function relativeTime(from: Date | string | number, now: Date | number = Date.now()): RelativeTime {
  const then = new Date(from).getTime();
  const nowMs = typeof now === "number" ? now : now.getTime();
  const diffSec = Math.max(0, Math.floor((nowMs - then) / 1000)); // future dates clamp to "just now"

  if (diffSec < 60) return { unit: "justNow", value: 0 };
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return { unit: "minutes", value: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: "hours", value: hours };
  return { unit: "days", value: Math.floor(hours / 24) };
}
