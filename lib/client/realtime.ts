const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Subscribes to "a station changed" hints on the Supabase Realtime broadcast channel.
 * The payload is NOT trusted: callers must re-fetch authoritative data from our API.
 * Returns an unsubscribe function. Resolves to a no-op when Supabase env vars are absent (polling still works).
 */
export function subscribeStationChanges(onChange: (stationId: string) => void): () => void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return () => undefined;

  let cleanup: (() => void) | null = null;
  let cancelled = false;

  void import("@supabase/supabase-js")
    .then(({ createClient }) => {
      if (cancelled) return;
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const channel = client
        .channel("stations")
        .on("broadcast", { event: "changed" }, (msg) => {
          const id = (msg.payload as { stationId?: unknown } | undefined)?.stationId;
          if (typeof id === "string" && UUID.test(id)) onChange(id);
        })
        .subscribe();
      cleanup = () => void client.removeChannel(channel);
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
