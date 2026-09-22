/** Fire-and-forget aggregate events. No user id, no location. Failures are ignored. */
export function trackEvent(e: { event: "station_view" | "fuel_search" | "app_open"; stationId?: string; fuelSlug?: string }): void {
  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
