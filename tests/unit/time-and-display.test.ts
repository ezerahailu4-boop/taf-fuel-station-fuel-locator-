import { describe, expect, it } from "vitest";
import { relativeTime } from "@/lib/time";
import { freshnessOf, isStale, resolveFuelDisplay } from "@/lib/fuel/display";
import { buildStationDTO } from "@/lib/fuel/dto";
import { FUEL_BENZINE, FUEL_DIESEL, makeStation } from "../helpers/fakes2";

const NOW = new Date("2026-09-21T12:00:00Z");
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000);

describe("relativeTime", () => {
  it("buckets into justNow / minutes / hours / days", () => {
    expect(relativeTime(ago(0), NOW)).toEqual({ unit: "justNow", value: 0 });
    expect(relativeTime(new Date(NOW.getTime() - 59_000), NOW)).toEqual({ unit: "justNow", value: 0 });
    expect(relativeTime(ago(1), NOW)).toEqual({ unit: "minutes", value: 1 });
    expect(relativeTime(ago(15), NOW)).toEqual({ unit: "minutes", value: 15 });
    expect(relativeTime(ago(60), NOW)).toEqual({ unit: "hours", value: 1 });
    expect(relativeTime(ago(180), NOW)).toEqual({ unit: "hours", value: 3 });
    expect(relativeTime(ago(60 * 24), NOW)).toEqual({ unit: "days", value: 1 });
    expect(relativeTime(ago(60 * 24 * 5), NOW)).toEqual({ unit: "days", value: 5 });
  });
  it("treats future timestamps (clock skew) as just now and accepts ISO strings", () => {
    expect(relativeTime(new Date(NOW.getTime() + 10_000), NOW).unit).toBe("justNow");
    expect(relativeTime(ago(5).toISOString(), NOW)).toEqual({ unit: "minutes", value: 5 });
  });
});

describe("staleness", () => {
  it("freshness is the later of last update and last confirmation", () => {
    expect(freshnessOf({ lastUpdated: ago(300), lastConfirmedAt: ago(10) })).toEqual(ago(10));
    expect(freshnessOf({ lastUpdated: ago(10), lastConfirmedAt: ago(300) })).toEqual(ago(10));
  });
  it("is stale only after the threshold", () => {
    expect(isStale(ago(119), NOW, 120)).toBe(false);
    expect(isStale(ago(121), NOW, 120)).toBe(true);
  });
  it("never-reported and UNKNOWN rows are flagged neverReported, not stale", () => {
    expect(resolveFuelDisplay(null, NOW, 120)).toEqual({ status: "UNKNOWN", neverReported: true, isStale: false });
  });
  it("stale rows keep their last REPORTED status and are flagged", () => {
    const d = resolveFuelDisplay({ status: "AVAILABLE", lastUpdated: ago(200), lastConfirmedAt: ago(200) }, NOW, 120);
    expect(d).toEqual({ status: "AVAILABLE", neverReported: false, isStale: true });
  });
  it("a recent 'still accurate' confirmation clears staleness", () => {
    const d = resolveFuelDisplay({ status: "OUT_OF_STOCK", lastUpdated: ago(500), lastConfirmedAt: ago(5) }, NOW, 120);
    expect(d.isStale).toBe(false);
  });
});

describe("buildStationDTO", () => {
  it("lists every active fuel type, marking unreported ones as UNKNOWN", () => {
    const row = makeStation({
      fuelStatuses: [{ fuelTypeId: FUEL_BENZINE.id, status: "AVAILABLE", note: null, lastUpdated: ago(3), lastConfirmedAt: ago(3) }],
    });
    const dto = buildStationDTO(row, [FUEL_BENZINE, FUEL_DIESEL], NOW, 120);
    expect(dto.fuels.map((f) => [f.slug, f.status, f.neverReported])).toEqual([
      ["benzine", "AVAILABLE", false],
      ["diesel", "UNKNOWN", true],
    ]);
    expect(dto.lastUpdated).toBe(ago(3).toISOString());
  });
  it("station lastUpdated is null when nothing was ever reported", () => {
    expect(buildStationDTO(makeStation(), [FUEL_BENZINE], NOW, 120).lastUpdated).toBeNull();
  });
});
