import { describe, expect, it, vi } from "vitest";
import { rankNearby } from "@/lib/geo/nearby";
import { buildStationDTO } from "@/lib/fuel/dto";
import { findNearby, type NearbyDeps } from "@/services/nearbyService";
import { createRealtimeSink } from "@/services/realtime";
import { nearbyBodySchema } from "@/lib/validation/station";
import { FakeActivityRepo } from "../helpers/fakes";
import { FUEL_BENZINE, FUEL_DIESEL, FakeFuelTypeRepo, FakeSettingsRepo, FakeStationRepo, makeStation } from "../helpers/fakes2";
import type { FuelStatus } from "@/lib/fuel/enums";
import type { StationRow } from "@/types/stations";

const NOW = new Date("2026-09-21T12:00:00Z");
const fresh = NOW;

// Origin near Bole. Distances (approx): bole ~0.5 km, saris ~8 km, megenagna ~3.7 km, kaliti ~11 km, far ~100+ km
const ORIGIN = { lat: 8.9990, lng: 38.7860 };

function st(id: string, branch: string, lat: number, lng: number, diesel: FuelStatus | null, over: Partial<StationRow> = {}): StationRow {
  return makeStation({
    id,
    branchName: branch,
    latitude: lat,
    longitude: lng,
    fuelStatuses: diesel ? [{ fuelTypeId: FUEL_DIESEL.id, status: diesel, note: null, lastUpdated: fresh, lastConfirmedAt: fresh }] : [],
    ...over,
  });
}

const rows = [
  st("bole", "Bole", 8.9955, 38.789, "OUT_OF_STOCK"),
  st("megenagna", "Megenagna", 9.0197, 38.8005, "AVAILABLE"),
  st("saris", "Saris", 8.9536, 38.7465, "LIMITED"),
  st("kaliti", "Kaliti", 8.8994, 38.7743, "AVAILABLE"),
  st("mombasa", "Far away", -4.04, 39.67, "AVAILABLE"),
];
const dtos = rows.map((r) => buildStationDTO(r, [FUEL_BENZINE, FUEL_DIESEL], NOW, 120));

describe("rankNearby", () => {
  it("puts stations with the fuel available FIRST (each group by distance), unavailable after", () => {
    const res = rankNearby(dtos, { origin: ORIGIN, radiusKm: 50, fuelSlug: "diesel" });
    expect(res.map((r) => [r.station.id, r.fuelMatch])).toEqual([
      ["megenagna", "available"],
      ["saris", "available"], // LIMITED counts as available
      ["kaliti", "available"],
      ["bole", "unavailable"], // closest overall, but out of diesel
    ]);
  });

  it("without a fuel, sorts purely by distance and leaves fuelMatch null", () => {
    const res = rankNearby(dtos, { origin: ORIGIN, radiusKm: 50 });
    expect(res.map((r) => r.station.id)).toEqual(["bole", "megenagna", "saris", "kaliti"]);
    expect(res.every((r) => r.fuelMatch === null)).toBe(true);
  });

  it("excludes stations outside the radius", () => {
    expect(rankNearby(dtos, { origin: ORIGIN, radiusKm: 1 }).map((r) => r.station.id)).toEqual(["bole"]);
    expect(rankNearby(dtos, { origin: ORIGIN, radiusKm: 0.1 })).toEqual([]);
  });

  it("distances are ascending inside a group and rounded sensibly", () => {
    const res = rankNearby(dtos, { origin: ORIGIN, radiusKm: 50, fuelSlug: "diesel" }).filter((r) => r.fuelMatch === "available");
    const d = res.map((r) => r.distanceKm);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
  });

  it("a fuel the station never reported counts as unavailable, not as a match", () => {
    const res = rankNearby([buildStationDTO(st("x", "X", 9, 38.78, null), [FUEL_DIESEL], NOW, 120)], { origin: ORIGIN, radiusKm: 50, fuelSlug: "diesel" });
    expect(res[0]!.fuelMatch).toBe("unavailable");
  });

  it("a CLOSED station never counts as available and openOnly removes it", () => {
    const closed = buildStationDTO(st("c", "C", 9.0, 38.79, "AVAILABLE", { status: "MAINTENANCE" }), [FUEL_DIESEL], NOW, 120);
    expect(rankNearby([closed], { origin: ORIGIN, radiusKm: 50, fuelSlug: "diesel" })[0]!.fuelMatch).toBe("unavailable");
    expect(rankNearby([closed], { origin: ORIGIN, radiusKm: 50, fuelSlug: "diesel", openOnly: true })).toEqual([]);
  });

  it("keeps stale reports in place but preserves the stale flag for the UI", () => {
    const old = new Date(NOW.getTime() - 500 * 60_000);
    const s = buildStationDTO(st("s", "S", 9.0, 38.79, "AVAILABLE", { fuelStatuses: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE", note: null, lastUpdated: old, lastConfirmedAt: old }] }), [FUEL_DIESEL], NOW, 120);
    const r = rankNearby([s], { origin: ORIGIN, radiusKm: 50, fuelSlug: "diesel" })[0]!;
    expect(r.fuelMatch).toBe("available");
    expect(r.station.fuels[0]!.isStale).toBe(true);
  });
});

function deps(over: Partial<NearbyDeps> = {}, settings: Record<string, unknown> = {}): NearbyDeps {
  return {
    stations: new FakeStationRepo(rows),
    fuelTypes: new FakeFuelTypeRepo([FUEL_BENZINE, FUEL_DIESEL]),
    settings: new FakeSettingsRepo(settings),
    activity: new FakeActivityRepo(),
    now: () => NOW,
    ...over,
  };
}

describe("findNearby (service)", () => {
  it("uses the configured default radius when none is given", async () => {
    const r = await findNearby(deps({}, { default_radius_km: 5 }), { lat: ORIGIN.lat, lng: ORIGIN.lng, limit: 20, fuel: "diesel" });
    expect(r.radiusKm).toBe(5);
    expect(r.items.map((i) => i.station.id)).toEqual(["megenagna", "bole"]);
  });

  it("falls back to 10 km when settings are missing", async () => {
    expect((await findNearby(deps(), { lat: ORIGIN.lat, lng: ORIGIN.lng, limit: 20 })).radiusKm).toBe(10);
  });

  it("respects limit and rejects unknown fuel types (400)", async () => {
    expect((await findNearby(deps(), { lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 50, limit: 2 })).items).toHaveLength(2);
    await expect(findNearby(deps(), { lat: ORIGIN.lat, lng: ORIGIN.lng, limit: 20, fuel: "unobtainium" })).rejects.toMatchObject({ status: 400 });
  });

  it("only considers stations inside the bounding-box prefilter (far stations never loaded)", async () => {
    const r = await findNearby(deps(), { lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 50, limit: 50 });
    expect(r.items.some((i) => i.station.id === "mombasa")).toBe(false);
  });

  it("PRIVACY: analytics receives the fuel slug only, never coordinates", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    await findNearby(deps({ analytics: { record } }), { lat: 8.9990123, lng: 38.7860123, limit: 20, fuel: "diesel" });
    expect(record).toHaveBeenCalledTimes(1);
    const arg = record.mock.calls[0]![0];
    expect(arg).toEqual({ event: "nearby_search", fuelSlug: "diesel" });
    expect(JSON.stringify(arg)).not.toMatch(/8\.999|38\.786/);
  });

  it("an analytics failure never fails the search", async () => {
    const analytics = { record: vi.fn().mockRejectedValue(new Error("db down")) };
    await expect(findNearby(deps({ analytics }), { lat: ORIGIN.lat, lng: ORIGIN.lng, limit: 20 })).resolves.toBeTruthy();
  });
});

describe("nearby request validation", () => {
  it("accepts valid input and applies the default limit", () => {
    expect(nearbyBodySchema.parse({ lat: 9, lng: 38.7 }).limit).toBe(20);
  });
  it("rejects bad coordinates, string coordinates, giant radii and odd fuel slugs", () => {
    for (const bad of [{ lat: 91, lng: 0 }, { lat: 0, lng: -181 }, { lat: "9", lng: 38 }, { lat: 9, lng: 38, radiusKm: 1000 }, { lat: 9, lng: 38, radiusKm: 0 }, { lat: 9, lng: 38, fuel: "Diesel; DROP" }]) {
      expect(nearbyBodySchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("realtime sink", () => {
  const evt = { stationId: "11111111-1111-4111-8111-111111111111", fuelTypeId: "f", fuelSlug: "diesel", oldStatus: "OUT_OF_STOCK" as const, newStatus: "AVAILABLE" as const, actorId: "a", at: NOW };

  it("POSTs a broadcast carrying ONLY the station id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 202 }));
    const sink = createRealtimeSink({ url: "https://proj.supabase.co/", serviceKey: "svc-key", fetchImpl });
    await sink.onFuelStatusChanged(evt);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://proj.supabase.co/realtime/v1/api/broadcast");
    expect(init.method).toBe("POST");
    expect(init.headers.apikey).toBe("svc-key");
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([{ topic: "stations", event: "changed", payload: { stationId: evt.stationId }, private: false }]);
    expect(init.body).not.toMatch(/AVAILABLE|OUT_OF_STOCK|diesel/);
  });

  it("is a silent no-op when Supabase is not configured", async () => {
    const fetchImpl = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sink = createRealtimeSink({ fetchImpl });
    await sink.onStationStatusChanged({ stationId: "s", oldStatus: "OPEN", newStatus: "CLOSED", actorId: "a", at: NOW });
    await sink.onAvailabilityConfirmed({ stationId: "s", actorId: "a", at: NOW });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1); // warns once, not on every event
    warn.mockRestore();
  });

  it("throws on a non-2xx broadcast so the service can log it (and still commit the update)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));
    const sink = createRealtimeSink({ url: "https://p.supabase.co", serviceKey: "k", fetchImpl });
    await expect(sink.onFuelStatusChanged(evt)).rejects.toThrow(/401/);
  });
});
