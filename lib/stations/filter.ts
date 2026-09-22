import { haversineKm, type LatLng } from "@/lib/geo/haversine";
import type { StationDTO } from "@/types/stations";

export interface StationFilters {
  q?: string;
  fuelSlug?: string | null;
  /** With fuelSlug: keep only stations reporting that fuel as AVAILABLE or LIMITED. */
  availableOnly?: boolean;
  radiusKm?: number | null;
  city?: string | null;
  area?: string | null;
  openOnly?: boolean;
}

export interface StationWithDistance {
  station: StationDTO;
  distanceKm: number | null;
}

export const isFuelAvailable = (status: string) => status === "AVAILABLE" || status === "LIMITED";

export function fuelOf(station: StationDTO, slug: string) {
  return station.fuels.find((f) => f.slug === slug);
}

const norm = (s: string) => s.trim().toLowerCase();

function matchesQuery(s: StationDTO, q: string): boolean {
  const needle = norm(q);
  if (!needle) return true;
  return [s.name, s.branchName, s.area ?? "", s.city, s.address].some((v) => norm(v).includes(needle));
}

/** Client-side filtering of the loaded station list, with distance when the user's location is known. */
export function filterAndSort(stations: StationDTO[], f: StationFilters, origin: LatLng | null): StationWithDistance[] {
  const out: StationWithDistance[] = [];
  for (const s of stations) {
    if (f.q && !matchesQuery(s, f.q)) continue;
    if (f.city && norm(s.city) !== norm(f.city)) continue;
    if (f.area && norm(s.area ?? "") !== norm(f.area)) continue;
    if (f.openOnly && s.status !== "OPEN") continue;
    if (f.fuelSlug && f.availableOnly) {
      const fuel = fuelOf(s, f.fuelSlug);
      if (!fuel || !isFuelAvailable(fuel.status)) continue;
    }
    const distanceKm = origin ? haversineKm(origin, { lat: s.latitude, lng: s.longitude }) : null;
    if (f.radiusKm != null && distanceKm !== null && distanceKm > f.radiusKm) continue;
    out.push({ station: s, distanceKm });
  }
  out.sort((a, b) =>
    a.distanceKm !== null && b.distanceKm !== null
      ? a.distanceKm - b.distanceKm
      : a.station.city.localeCompare(b.station.city) || a.station.branchName.localeCompare(b.station.branchName),
  );
  return out;
}
