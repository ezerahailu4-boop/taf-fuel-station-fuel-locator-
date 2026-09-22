"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiClientError, apiFetch, NetworkError } from "@/lib/client/api";
import { getCurrentLocation, LocationError } from "@/lib/client/geolocation";
import { subscribeStationChanges } from "@/lib/client/realtime";
import { loadStationCache, saveStationCache } from "@/lib/client/stationCache";
import type { LatLng } from "@/lib/geo/haversine";
import type { FuelTypeRow, Page, StationDTO } from "@/types/stations";

export interface UserLocation extends LatLng {
  source: "gps" | "area";
  label?: string;
}

type LoadStatus = "loading" | "ready" | "error";
type LocationStatus = "idle" | "asking" | "denied" | "unavailable";

interface Ctx {
  status: LoadStatus;
  error: "network" | "server" | null;
  /** Set when the list on screen came from the local cache because the network failed. */
  offlineSince: number | null;
  stations: StationDTO[];
  fuelTypes: FuelTypeRow[];
  areas: Array<{ label: string; lat: number; lng: number }>;
  location: UserLocation | null;
  locationStatus: LocationStatus;
  selectedFuel: string | null;
  setSelectedFuel(slug: string | null): void;
  requestLocation(): Promise<UserLocation | null>;
  setAreaLocation(label: string): void;
  clearLocation(): void;
  refresh(): Promise<void>;
  getStation(id: string): StationDTO | undefined;
  upsertStation(s: StationDTO): void;
}

const StationsContext = createContext<Ctx | null>(null);

export function useStations(): Ctx {
  const c = useContext(StationsContext);
  if (!c) throw new Error("useStations must be used inside <StationsProvider>");
  return c;
}

const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const REFRESH_INTERVAL_MS = 5 * 60_000;

async function fetchAll(bust: boolean): Promise<{ stations: StationDTO[]; fuelTypes: FuelTypeRow[] }> {
  const t = bust ? `&_t=${Date.now()}` : "";
  const fuel = await apiFetch<{ items: FuelTypeRow[] }>(`/api/fuel-types${bust ? `?_t=${Date.now()}` : ""}`);
  const stations: StationDTO[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiFetch<Page<StationDTO>>(`/api/stations?page=${page}&pageSize=${PAGE_SIZE}${t}`);
    stations.push(...res.items);
    if (stations.length >= res.total || res.items.length === 0) break;
  }
  return { stations, fuelTypes: fuel.items };
}

export function StationsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<Ctx["error"]>(null);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelTypeRow[]>([]);
  // Location lives ONLY in memory: never written to storage, URLs or analytics.
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [selectedFuel, setSelectedFuel] = useState<string | null>(null);
  const lastLoad = useRef(0);

  const load = useCallback(async (bust: boolean) => {
    try {
      const data = await fetchAll(bust);
      setStations(data.stations);
      setFuelTypes(data.fuelTypes);
      setOfflineSince(null);
      setError(null);
      setStatus("ready");
      lastLoad.current = Date.now();
      saveStationCache(data);
    } catch (e) {
      const cached = e instanceof ApiClientError ? null : loadStationCache();
      if (cached) {
        setStations(cached.stations);
        setFuelTypes(cached.fuelTypes);
        setOfflineSince(cached.at);
        setError(null);
        setStatus("ready");
      } else {
        setError(e instanceof NetworkError ? "network" : "server");
        setStatus((s) => (s === "ready" ? s : "error"));
      }
    }
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Auto-detect user location on launch (gentle background detection)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getCurrentLocation(6000);
        if (active && p) {
          setLocation({ ...p, source: "gps" });
          setLocationStatus("idle");
        }
      } catch {
        if (active) setLocationStatus("idle");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live updates: a broadcast is only a hint; we re-fetch that station from the API (never trust the payload).
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const unsubscribe = subscribeStationChanges((id) => {
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(async () => {
          try {
            const fresh = await apiFetch<StationDTO>(`/api/stations/${id}?_t=${Date.now()}`);
            setStations((cur) => (cur.some((s) => s.id === id) ? cur.map((s) => (s.id === id ? fresh : s)) : [...cur, fresh]));
          } catch (e) {
            if (e instanceof ApiClientError && e.status === 404) setStations((cur) => cur.filter((s) => s.id !== id));
          }
        }, 300),
      );
    });
    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, []);

  // Keep data honest: periodic refresh, plus on regaining connectivity / returning to the app.
  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > 60_000) void load(true);
    };
    const onOnline = () => void load(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [load]);

  const areas = useMemo(() => {
    const groups = new Map<string, { lat: number; lng: number; n: number }>();
    for (const s of stations) {
      const label = s.area?.trim() || s.city;
      const g = groups.get(label) ?? { lat: 0, lng: 0, n: 0 };
      groups.set(label, { lat: g.lat + s.latitude, lng: g.lng + s.longitude, n: g.n + 1 });
    }
    return [...groups.entries()]
      .map(([label, g]) => ({ label, lat: g.lat / g.n, lng: g.lng / g.n }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stations]);

  const requestLocation = useCallback(async () => {
    setLocationStatus("asking");
    try {
      const p = await getCurrentLocation();
      const loc: UserLocation = { ...p, source: "gps" };
      setLocation(loc);
      setLocationStatus("idle");
      return loc;
    } catch (e) {
      setLocationStatus(e instanceof LocationError && e.reason === "denied" ? "denied" : "unavailable");
      return null;
    }
  }, []);

  const setAreaLocation = useCallback(
    (label: string) => {
      const a = areas.find((x) => x.label === label);
      if (a) {
        setLocation({ lat: a.lat, lng: a.lng, source: "area", label });
        setLocationStatus("idle");
      }
    },
    [areas],
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
    setLocationStatus("idle");
  }, []);

  const upsertStation = useCallback((s: StationDTO) => {
    setStations((cur) => (cur.some((x) => x.id === s.id) ? cur.map((x) => (x.id === s.id ? s : x)) : [...cur, s]));
  }, []);

  const getStation = useCallback((id: string) => stations.find((s) => s.id === id), [stations]);

  const value = useMemo<Ctx>(
    () => ({ status, error, offlineSince, stations, fuelTypes, areas, location, locationStatus, selectedFuel, setSelectedFuel, requestLocation, setAreaLocation, clearLocation, refresh, getStation, upsertStation }),
    [status, error, offlineSince, stations, fuelTypes, areas, location, locationStatus, selectedFuel, requestLocation, setAreaLocation, clearLocation, refresh, getStation, upsertStation],
  );
  return <StationsContext.Provider value={value}>{children}</StationsContext.Provider>;
}
