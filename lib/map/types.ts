import type { LatLng } from "@/lib/geo/haversine";
import type { Tone } from "@/lib/stations/tone";

/** Provider-agnostic map contracts. Swap OSM/Leaflet for Mapbox or Google by adding one file + one switch case. */
export interface MapMarkerSpec {
  id: string;
  lat: number;
  lng: number;
  tone: Tone;
  glyph: string;
  /** Accessible name, e.g. "TAF Bole, fuel available". */
  label: string;
  /** Builds popup content with DOM APIs (textContent), never HTML strings, so station data can't inject markup. */
  renderPopup: () => HTMLElement;
}

export interface MapController {
  setMarkers(markers: MapMarkerSpec[], opts?: { fit?: boolean }): void;
  setUserLocation(p: LatLng | null): void;
  focus(id: string): void;
  invalidateSize(): void;
  destroy(): void;
}

export interface MapMountOptions {
  center: LatLng;
  zoom: number;
}

export interface MapProvider {
  id: string;
  mount(el: HTMLElement, opts: MapMountOptions): Promise<MapController>;
}
