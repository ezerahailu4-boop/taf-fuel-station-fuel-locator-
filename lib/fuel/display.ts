import type { FuelStatus } from "./enums";

export interface FuelRowTimes {
  status: FuelStatus;
  lastUpdated: Date;
  lastConfirmedAt: Date;
}

/**
 * Freshness = the most recent of "status changed" and "admin confirmed it is still accurate".
 */
export function freshnessOf(row: Pick<FuelRowTimes, "lastUpdated" | "lastConfirmedAt">): Date {
  return row.lastConfirmedAt > row.lastUpdated ? row.lastConfirmedAt : row.lastUpdated;
}

export function isStale(freshness: Date, now: Date, staleAfterMinutes: number): boolean {
  return now.getTime() - freshness.getTime() > staleAfterMinutes * 60_000;
}

export interface FuelDisplay {
  /** Last REPORTED status (what a branch admin last said). Never silently upgraded to "current". */
  status: FuelStatus;
  neverReported: boolean;
  isStale: boolean;
}

/** Rows that were never set, or whose freshness passed the threshold, are flagged so the UI can warn. */
export function resolveFuelDisplay(row: FuelRowTimes | null, now: Date, staleAfterMinutes: number): FuelDisplay {
  if (!row || row.status === "UNKNOWN") return { status: "UNKNOWN", neverReported: true, isStale: false };
  return {
    status: row.status,
    neverReported: false,
    isStale: isStale(freshnessOf(row), now, staleAfterMinutes),
  };
}
