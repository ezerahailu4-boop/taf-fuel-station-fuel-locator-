import type { MapProvider } from "./types";

/**
 * Selects the map provider. Loaded lazily so the map library
 * is never part of the initial bundle.
 * Falls back safely to Leaflet / OpenStreetMap in all cases.
 */
export async function loadMapProvider(id?: string): Promise<MapProvider> {
  const provider = (id || process.env.NEXT_PUBLIC_MAP_PROVIDER || "osm").toLowerCase().trim();
  switch (provider) {
    case "osm":
    case "leaflet":
    case "openstreetmap":
    default:
      return (await import("./leaflet")).leafletProvider;
  }
}
