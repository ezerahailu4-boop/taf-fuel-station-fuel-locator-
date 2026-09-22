import type { LatLng } from "@/lib/geo/haversine";
import "@/types/telegram";

export type LocationFailure = "denied" | "unavailable" | "timeout";
export class LocationError extends Error {
  constructor(public readonly reason: LocationFailure) {
    super(reason);
    this.name = "LocationError";
  }
}

function browserLocation(timeoutMs: number): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new LocationError("unavailable"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new LocationError(e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "unavailable")),
      // Coarse, cached-ok position: enough for "nearest station" and cheaper on battery.
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** Telegram's LocationManager (Bot API 8.0+). Resolves null when it can't be used, so the caller falls back to the browser API. */
function telegramLocation(timeoutMs: number): Promise<LatLng | "denied" | null> {
  const lm = window.Telegram?.WebApp?.LocationManager;
  if (!lm) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: LatLng | "denied" | null) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    setTimeout(() => finish(null), timeoutMs);
    try {
      lm.init(() => {
        if (!lm.isLocationAvailable) return finish(null);
        lm.getLocation((loc) => finish(loc ? { lat: loc.latitude, lng: loc.longitude } : "denied"));
      });
    } catch {
      finish(null);
    }
  });
}

/** One-shot position. Never persisted, never watched (no continuous tracking). */
export async function getCurrentLocation(timeoutMs = 10_000): Promise<LatLng> {
  const tg = await telegramLocation(4_000);
  if (tg && tg !== "denied") return tg;
  // If Telegram explicitly reported denial we still try the browser API once: it may hold its own permission.
  return browserLocation(timeoutMs);
}
