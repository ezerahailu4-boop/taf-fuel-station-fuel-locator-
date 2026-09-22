export interface DirectionsLink {
  id: "google" | "apple" | "osm" | "geo";
  label: string;
  url: string;
}

/** Navigation deep links. Google Maps is the primary (works on most Ethiopian Android phones); others are alternatives. */
export function directionsLinks(lat: number, lng: number, name?: string): DirectionsLink[] {
  const dest = `${lat},${lng}`;
  const label = name ? `(${encodeURIComponent(name)})` : "";
  return [
    { id: "google", label: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving` },
    { id: "apple", label: "Apple Maps", url: `https://maps.apple.com/?daddr=${dest}&dirflg=d` },
    { id: "osm", label: "OpenStreetMap", url: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${dest}` },
    { id: "geo", label: "Other apps", url: `geo:${dest}?q=${dest}${label}` },
  ];
}

export const primaryDirectionsUrl = (lat: number, lng: number, name?: string) => directionsLinks(lat, lng, name)[0]!.url;
