import type { FuelTypeRow, StationDTO } from "@/types/stations";

const KEY = "taf:stations:v1";

export interface StationCache {
  at: number;
  stations: StationDTO[];
  fuelTypes: FuelTypeRow[];
}

/** Last-known station list for offline/slow-network fallback. Contains no user data or location. */
export function saveStationCache(data: Omit<StationCache, "at">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), ...data }));
  } catch {
    /* storage full / blocked: fine */
  }
}

export function loadStationCache(): StationCache | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StationCache;
    return Array.isArray(parsed.stations) && Array.isArray(parsed.fuelTypes) && typeof parsed.at === "number" ? parsed : null;
  } catch {
    return null;
  }
}
