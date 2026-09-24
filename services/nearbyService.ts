import { badRequest } from "@/lib/api/errors";
import { boundingBox, haversineKm } from "@/lib/geo/haversine";
import { rankNearby, type NearbyResult } from "@/lib/geo/nearby";
import type { NearbyBody } from "@/lib/validation/station";
import type { AnalyticsRepo } from "@/types/stations";
import { buildStationDTO } from "@/lib/fuel/dto";
import { getStaleAfterMinutes, type StationServiceDeps } from "./stationService";

export interface NearbyDeps extends StationServiceDeps {
  analytics?: AnalyticsRepo;
}

const DEFAULT_RADIUS_KM = 10;
const MAX_CANDIDATES = 200;

export interface NearbyResponse {
  items: NearbyResult[];
  radiusKm: number;
  fuel: string | null;
}

/**
 * Nearest stations for a fuel type.
 * PRIVACY: the caller's coordinates exist only in this function's scope. They are used to compute distances,
 * are never stored, never logged, and never passed to analytics.
 */
export async function findNearby(d: NearbyDeps, body: NearbyBody): Promise<NearbyResponse> {
  const [fuelTypes, staleMin, settings] = await Promise.all([
    d.fuelTypes.list({ includeInactive: false }),
    getStaleAfterMinutes(d.settings),
    d.settings.getMany(["default_radius_km"]),
  ]);

  if (body.fuel && !fuelTypes.some((f) => f.slug === body.fuel)) throw badRequest("Unknown fuel type");

  const configured = settings.default_radius_km;
  const initialRadius = body.radiusKm ?? (typeof configured === "number" && configured > 0 ? configured : DEFAULT_RADIUS_KM);
  let currentRadius = initialRadius;

  const origin = { lat: body.lat, lng: body.lng };
  let rows = await d.stations.listInBox(boundingBox(origin, currentRadius), MAX_CANDIDATES);

  const now = (d.now ?? (() => new Date()))();
  let dtos = rows.map((r) => buildStationDTO(r, fuelTypes, now, staleMin));
  let items = rankNearby(dtos, { origin, radiusKm: currentRadius, fuelSlug: body.fuel ?? null, openOnly: body.openOnly }).slice(0, body.limit);

  // If user did not request an explicit radius constraint and no stations are within the initial radius,
  // progressively expand search (25km, 50km, 100km, or fallback to all active stations)
  // so users outside the immediate circle still find their nearest TAF station!
  if (!body.radiusKm && items.length === 0) {
    const wideSteps = [25, 50, 100];
    for (const r of wideSteps) {
      if (r <= currentRadius) continue;
      currentRadius = r;
      rows = await d.stations.listInBox(boundingBox(origin, currentRadius), MAX_CANDIDATES);
      if (rows.length > 0) {
        dtos = rows.map((row) => buildStationDTO(row, fuelTypes, now, staleMin));
        items = rankNearby(dtos, { origin, radiusKm: currentRadius, fuelSlug: body.fuel ?? null, openOnly: body.openOnly }).slice(0, body.limit);
        if (items.length > 0) break;
      }
    }

    if (items.length === 0) {
      const allActive = await d.stations.list({ page: 1, pageSize: 50, includeInactive: false });
      if (allActive.items.length > 0) {
        dtos = allActive.items.map((row) => buildStationDTO(row, fuelTypes, now, staleMin));
        const maxDist = Math.max(...dtos.map((s) => haversineKm(origin, { lat: s.latitude, lng: s.longitude }))) + 10;
        currentRadius = Math.ceil(maxDist);
        items = rankNearby(dtos, { origin, radiusKm: currentRadius, fuelSlug: body.fuel ?? null, openOnly: body.openOnly }).slice(0, body.limit);
      }
    }
  }

  // Aggregate-only analytics, fire and forget, never blocks or fails the request.
  if (d.analytics) {
    void d.analytics.record({ event: "nearby_search", fuelSlug: body.fuel ?? null }).catch(() => undefined);
  }

  return { items, radiusKm: currentRadius, fuel: body.fuel ?? null };
}
