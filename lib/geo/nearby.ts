import { isFuelAvailable, fuelOf } from "@/lib/stations/filter";
import { haversineKm, type LatLng } from "./haversine";
import type { StationDTO } from "@/types/stations";

export interface NearbyOptions {
  origin: LatLng;
  radiusKm: number;
  fuelSlug?: string | null;
  openOnly?: boolean;
}

export interface NearbyResult {
  station: StationDTO;
  distanceKm: number;
  /** null when no fuel was requested. */
  fuelMatch: "available" | "unavailable" | null;
}

/**
 * "Find nearest available <fuel>":
 *   1. drop stations outside the radius (and closed ones if openOnly)
 *   2. stations reporting the fuel AVAILABLE/LIMITED first, each group sorted by distance
 *   3. everything else (out of stock / unknown / not carried) after them, also by distance
 * Stale reports are kept in place but keep their isStale flag so the UI can warn.
 */
export function rankNearby(stations: StationDTO[], opts: NearbyOptions): NearbyResult[] {
  const results: NearbyResult[] = [];
  for (const s of stations) {
    if (!s.isActive) continue;
    if (opts.openOnly && s.status !== "OPEN") continue;
    const distanceKm = haversineKm(opts.origin, { lat: s.latitude, lng: s.longitude });
    if (distanceKm > opts.radiusKm) continue;

    let fuelMatch: NearbyResult["fuelMatch"] = null;
    if (opts.fuelSlug) {
      const fuel = fuelOf(s, opts.fuelSlug);
      fuelMatch = fuel && isFuelAvailable(fuel.status) && s.status === "OPEN" ? "available" : "unavailable";
    }
    results.push({ station: s, distanceKm, fuelMatch });
  }

  const group = (r: NearbyResult) => (r.fuelMatch === "unavailable" ? 1 : 0);
  return results.sort((a, b) => group(a) - group(b) || a.distanceKm - b.distanceKm);
}
