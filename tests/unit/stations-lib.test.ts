import { describe, expect, it } from "vitest";
import { directionsLinks, primaryDirectionsUrl } from "@/lib/directions";
import { filterAndSort } from "@/lib/stations/filter";
import { openingHoursToday, weekdayKey } from "@/lib/stations/hours";
import { stationTone, stationToneForFuel, TONE_GLYPH } from "@/lib/stations/tone";
import { buildStationDTO } from "@/lib/fuel/dto";
import { FUEL_BENZINE, FUEL_DIESEL, makeStation } from "../helpers/fakes2";
import type { FuelStatus } from "@/lib/fuel/enums";
import type { StationRow } from "@/types/stations";

const NOW = new Date("2026-09-21T12:00:00Z"); // a Monday
const mk = (id: string, over: Partial<StationRow> & { diesel?: FuelStatus; benz?: FuelStatus }) => {
  const { diesel, benz, ...rest } = over;
  const fs = [
    ...(diesel ? [{ fuelTypeId: FUEL_DIESEL.id, status: diesel, note: null, lastUpdated: NOW, lastConfirmedAt: NOW }] : []),
    ...(benz ? [{ fuelTypeId: FUEL_BENZINE.id, status: benz, note: null, lastUpdated: NOW, lastConfirmedAt: NOW }] : []),
  ];
  return buildStationDTO(makeStation({ id, fuelStatuses: fs, ...rest }), [FUEL_BENZINE, FUEL_DIESEL], NOW, 120);
};

const bole = mk("bole", { branchName: "Bole", area: "Bole", latitude: 8.9955, longitude: 38.789, diesel: "AVAILABLE", benz: "OUT_OF_STOCK" });
const saris = mk("saris", { branchName: "Saris", area: "Saris", latitude: 8.9536, longitude: 38.7465, diesel: "OUT_OF_STOCK" });
const dire = mk("dire", { branchName: "Dire Dawa", city: "Dire Dawa", area: "Kezira", address: "Kezira road", latitude: 9.6, longitude: 41.85, status: "MAINTENANCE", diesel: "LIMITED" });
const all = [saris, dire, bole];

describe("filterAndSort", () => {
  it("without a location: sorts by city then branch, no distances", () => {
    const r = filterAndSort(all, {}, null);
    expect(r.map((x) => x.station.id)).toEqual(["bole", "saris", "dire"]);
    expect(r.every((x) => x.distanceKm === null)).toBe(true);
  });
  it("with a location: sorts by distance", () => {
    const r = filterAndSort(all, {}, { lat: 8.9536, lng: 38.7465 });
    expect(r.map((x) => x.station.id)).toEqual(["saris", "bole", "dire"]);
    expect(r[0]!.distanceKm).toBeCloseTo(0, 3);
  });
  it("text search matches name, area, city and address, case-insensitively", () => {
    expect(filterAndSort(all, { q: "  SARIS " }, null).map((x) => x.station.id)).toEqual(["saris"]);
    expect(filterAndSort(all, { q: "kezira" }, null).map((x) => x.station.id)).toEqual(["dire"]);
    expect(filterAndSort(all, { q: "dire dawa" }, null).map((x) => x.station.id)).toEqual(["dire"]);
    expect(filterAndSort(all, { q: "zzz" }, null)).toEqual([]);
  });
  it("fuel + availableOnly keeps AVAILABLE and LIMITED, drops out-of-stock/unknown", () => {
    expect(filterAndSort(all, { fuelSlug: "diesel", availableOnly: true }, null).map((x) => x.station.id).sort()).toEqual(["bole", "dire"]);
    expect(filterAndSort(all, { fuelSlug: "benzine", availableOnly: true }, null)).toEqual([]);
  });
  it("radius filter needs a location and excludes far stations", () => {
    const origin = { lat: 8.9955, lng: 38.789 };
    expect(filterAndSort(all, { radiusKm: 10 }, origin).map((x) => x.station.id)).toEqual(["bole", "saris"]);
    expect(filterAndSort(all, { radiusKm: 10 }, null)).toHaveLength(3); // no location → radius ignored
  });
  it("openOnly hides stations that are not OPEN; city/area filters are exact", () => {
    expect(filterAndSort(all, { openOnly: true }, null).map((x) => x.station.id)).toEqual(["bole", "saris"]);
    expect(filterAndSort(all, { city: "dire dawa" }, null).map((x) => x.station.id)).toEqual(["dire"]);
    expect(filterAndSort(all, { area: "Bole" }, null).map((x) => x.station.id)).toEqual(["bole"]);
  });
  it("filters combine (AND)", () => {
    expect(filterAndSort(all, { fuelSlug: "diesel", availableOnly: true, openOnly: true }, null).map((x) => x.station.id)).toEqual(["bole"]);
  });
});

describe("stationTone", () => {
  it("summarises fuels, and any non-OPEN status wins as 'closed'", () => {
    expect(stationTone(bole)).toBe("available");
    expect(stationTone(saris)).toBe("out");
    expect(stationTone(mk("l", { diesel: "LIMITED" }))).toBe("limited");
    expect(stationTone(mk("u", {}))).toBe("unknown");
    expect(stationTone(dire)).toBe("closed");
  });
  it("every tone has a non-color glyph", () => {
    for (const g of Object.values(TONE_GLYPH)) expect(g.length).toBeGreaterThan(0);
    expect(new Set(Object.values(TONE_GLYPH)).size).toBe(5);
  });
});

describe("stationToneForFuel", () => {
  it("colors a pin by the SELECTED fuel, and 'closed' always wins", () => {
    expect(stationToneForFuel(bole, "diesel")).toBe("available");
    expect(stationToneForFuel(bole, "benzine")).toBe("out");
    expect(stationToneForFuel(saris, "kerosene")).toBe("unknown");
    expect(stationToneForFuel(bole, "nope")).toBe("unknown");
    expect(stationToneForFuel(dire, "diesel")).toBe("closed");
    expect(stationToneForFuel(bole, null)).toBe(stationTone(bole));
  });
});

describe("opening hours", () => {
  it("24h and unknown shapes", () => {
    expect(openingHoursToday({ is24h: true }, NOW)).toEqual({ kind: "24h" });
    expect(openingHoursToday(null, NOW)).toEqual({ kind: "unknown" });
    expect(openingHoursToday("nope", NOW)).toEqual({ kind: "unknown" });
  });
  it("uses Ethiopian local weekday, not the device's", () => {
    expect(weekdayKey(new Date("2026-09-21T12:00:00Z"))).toBe("mon");
    // 22:30 UTC Sunday is already Monday 01:30 in Addis Ababa (UTC+3)
    expect(weekdayKey(new Date("2026-09-20T22:30:00Z"))).toBe("mon");
  });
  it("returns today's ranges, or closedToday when the day is absent/empty", () => {
    const hours = { mon: [["06:00", "22:00"]], tue: [] };
    expect(openingHoursToday(hours, NOW)).toEqual({ kind: "ranges", ranges: [["06:00", "22:00"]] });
    expect(openingHoursToday(hours, new Date("2026-09-22T12:00:00Z"))).toEqual({ kind: "closedToday" });
    expect(openingHoursToday(hours, new Date("2026-09-23T12:00:00Z"))).toEqual({ kind: "closedToday" });
  });
});

describe("directions", () => {
  it("builds a Google Maps destination URL with the exact coordinates", () => {
    const url = new URL(primaryDirectionsUrl(8.9955, 38.789));
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("destination")).toBe("8.9955,38.789");
  });
  it("offers alternatives for other navigation apps", () => {
    expect(directionsLinks(9, 38.7, "TAF Bole").map((l) => l.id)).toEqual(["google", "apple", "osm", "geo"]);
    expect(directionsLinks(9, 38.7).find((l) => l.id === "geo")!.url).toBe("geo:9,38.7?q=9,38.7");
  });
});
