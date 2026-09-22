import type { StatusChangeSink } from "@/types/stations";

export interface RealtimeConfig {
  /** https://<project>.supabase.co */
  url?: string;
  /** SERVER ONLY. */
  serviceKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const REALTIME_TOPIC = "stations";
export const REALTIME_EVENT = "changed";

/**
 * Publishes "station X changed" on a Supabase Realtime Broadcast channel.
 * SECURITY: the payload carries ONLY the station id. Clients treat it as a hint and re-fetch the authoritative
 * data from our API, so anyone spoofing the public channel can at most cause a harmless refetch.
 */
export function createRealtimeSink(cfg: RealtimeConfig): StatusChangeSink {
  const doFetch = cfg.fetchImpl ?? fetch;
  let warned = false;

  async function broadcast(stationId: string): Promise<void> {
    if (!cfg.url || !cfg.serviceKey) {
      if (!warned) {
        warned = true;
        console.warn("[realtime] Supabase URL / service key not set: live updates are disabled");
      }
      return;
    }
    const res = await doFetch(`${cfg.url.replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
      body: JSON.stringify({ messages: [{ topic: REALTIME_TOPIC, event: REALTIME_EVENT, payload: { stationId }, private: false }] }),
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 3000),
    });
    if (!res.ok) throw new Error(`Realtime broadcast failed (${res.status})`);
  }

  return {
    onFuelStatusChanged: (e) => broadcast(e.stationId),
    onStationStatusChanged: (e) => broadcast(e.stationId),
    onAvailabilityConfirmed: (e) => broadcast(e.stationId),
  };
}
