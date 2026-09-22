export type OpeningHoursInfo =
  | { kind: "24h" }
  | { kind: "ranges"; ranges: Array<[string, string]> }
  | { kind: "closedToday" }
  | { kind: "unknown" };

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const TZ = "Africa/Addis_Ababa";

/** Weekday key in Ethiopian local time, independent of the viewer's device timezone. */
export function weekdayKey(now: Date, timeZone = TZ): (typeof DAYS)[number] {
  const short = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(now).toLowerCase().slice(0, 3);
  return (DAYS as readonly string[]).includes(short) ? (short as (typeof DAYS)[number]) : "mon";
}

/** Reads the stored JSON ({ is24h: true } | { mon: [["06:00","22:00"]], ... }) into something displayable for today. */
export function openingHoursToday(raw: unknown, now: Date): OpeningHoursInfo {
  if (!raw || typeof raw !== "object") return { kind: "unknown" };
  const obj = raw as Record<string, unknown>;
  if (obj.is24h === true) return { kind: "24h" };

  const today = obj[weekdayKey(now)];
  if (today === undefined) return { kind: "closedToday" };
  if (!Array.isArray(today) || today.length === 0) return { kind: "closedToday" };
  const ranges = today.filter((r): r is [string, string] => Array.isArray(r) && typeof r[0] === "string" && typeof r[1] === "string");
  return ranges.length > 0 ? { kind: "ranges", ranges } : { kind: "closedToday" };
}
