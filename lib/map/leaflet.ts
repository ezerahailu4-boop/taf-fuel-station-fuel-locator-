import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapController, MapMarkerSpec, MapMountOptions, MapProvider } from "./types";

/** Leaflet + OpenStreetMap tiles: no API key. For heavy traffic use a commercial tile provider (OSM's tile policy is for light use). */
export const leafletProvider: MapProvider = {
  id: "osm",
  async mount(el: HTMLElement, opts: MapMountOptions): Promise<MapController> {
    const map = L.map(el, { zoomControl: true, attributionControl: true }).setView([opts.center.lat, opts.center.lng], opts.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    const markers = new Map<string, L.Marker>();
    let user: L.CircleMarker | null = null;

    const iconFor = (m: MapMarkerSpec) =>
      L.divIcon({
        className: "taf-pin-wrap",
        html: `<div class="taf-pin taf-pin--${m.tone}" aria-hidden="true"><span class="taf-pin__glyph">${m.glyph}</span></div>`,
        iconSize: [36, 40],
        iconAnchor: [18, 38],
        popupAnchor: [0, -34],
      });

    return {
      setMarkers(specs, o) {
        layer.clearLayers();
        markers.clear();
        for (const m of specs) {
          const marker = L.marker([m.lat, m.lng], { icon: iconFor(m), title: m.label, alt: m.label, keyboard: true }).bindPopup(() => m.renderPopup(), { maxWidth: 260, minWidth: 220, autoPan: true, autoPanPadding: L.point(16, 24) });
          marker.addTo(layer);
          markers.set(m.id, marker);
        }
        if (o?.fit && specs.length > 0) {
          const pts = specs.map((s) => [s.lat, s.lng] as [number, number]);
          map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15, animate: false });
        }
      },
      setUserLocation(p) {
        user?.remove();
        user = null;
        if (p) {
          user = L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
          user.bindTooltip("You", { permanent: false });
        }
      },
      focus(id) {
        const m = markers.get(id);
        if (!m) return;
        map.setView(m.getLatLng(), Math.max(map.getZoom(), 15), { animate: false });
        m.openPopup();
      },
      invalidateSize: () => void map.invalidateSize(),
      destroy: () => void map.remove(),
    };
  },
};
