import { badRequest } from "@/lib/api/errors";
import { boundingBox } from "@/lib/geo/haversine";
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
  const radiusKm = body.radiusKm ?? (typeof configured === "number" && configured > 0 ? configured : DEFAULT_RADIUS_KM);

  const origin = { lat: body.lat, lng: body.lng };
  const rows = await d.stations.listInBox(boundingBox(origin, radiusKm), MAX_CANDIDATES);

  const now = (d.now ?? (() => new Date()))();
  const dtos = rows.map((r) => buildStationDTO(r, fuelTypes, now, staleMin));
  const items = rankNearby(dtos, { origin, radiusKm, fuelSlug: body.fuel ?? null, openOnly: body.openOnly }).slice(0, body.limit);

  // Aggregate-only analytics, fire and forget, never blocks or fails the request.
  if (d.analytics) {
    void d.analytics.record({ event: "nearby_search", fuelSlug: body.fuel ?? null }).catch(() => undefined);
  }

  return { items, radiusKm, fuel: body.fuel ?? null };
}
