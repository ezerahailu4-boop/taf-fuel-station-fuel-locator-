import type { MapProvider } from "./types";

/**
 * Selects the map provider from NEXT_PUBLIC_MAP_PROVIDER (default "osm"). Loaded lazily so the map library
 * is never part of the initial bundle.
 * To add Mapbox/Google: create lib/map/mapbox.ts exporting a MapProvider and add a case here.
 */
export async function loadMapProvider(id: string = process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "osm"): Promise<MapProvider> {
  switch (id) {
    case "osm":
      return (await import("./leaflet")).leafletProvider;
    default:
      throw new Error(`Unknown map provider "${id}". Add it in lib/map/index.ts`);
  }
}
