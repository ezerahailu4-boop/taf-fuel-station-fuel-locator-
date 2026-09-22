import { describe, expect, it } from "vitest";
import { boundingBox, formatDistance, haversineKm, isValidLatLng } from "@/lib/geo/haversine";

describe("haversineKm", () => {
  it("is zero for identical points and symmetric", () => {
    const a = { lat: 9.0192, lng: 38.7525 };
    const b = { lat: 8.9955, lng: 38.789 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
  it("matches a known reference distance (London → Paris ≈ 343.5 km)", () => {
    const d = haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(d).toBeGreaterThan(342);
    expect(d).toBeLessThan(345);
  });
  it("one degree of latitude ≈ 111.2 km", () => {
    expect(haversineKm({ lat: 9, lng: 38 }, { lat: 10, lng: 38 })).toBeCloseTo(111.2, 0);
  });
});

describe("boundingBox", () => {
  const center = { lat: 9.0, lng: 38.75 };
  it("contains every point within the radius (sampled around the circle)", () => {
    const r = 10;
    const box = boundingBox(center, r);
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      // a point ~9.9 km away in that direction
      const p = { lat: center.lat + (9.9 / 111.2) * Math.cos(rad), lng: center.lng + (9.9 / (111.2 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(rad) };
      expect(haversineKm(center, p)).toBeLessThan(r);
      expect(p.lat).toBeGreaterThanOrEqual(box.minLat);
      expect(p.lat).toBeLessThanOrEqual(box.maxLat);
      expect(p.lng).toBeGreaterThanOrEqual(box.minLng);
      expect(p.lng).toBeLessThanOrEqual(box.maxLng);
    }
  });
  it("is not absurdly larger than the radius", () => {
    const box = boundingBox(center, 10);
    expect(box.maxLat - box.minLat).toBeLessThan(0.2);
  });
  it("clamps at the poles", () => {
    const box = boundingBox({ lat: 89.9, lng: 0 }, 500);
    expect(box.maxLat).toBeLessThanOrEqual(90);
  });
});

describe("formatDistance", () => {
  it("formats meters, one-decimal km, and whole km", () => {
    expect(formatDistance(0.85)).toBe("850 m");
    expect(formatDistance(0.004)).toBe("10 m");
    expect(formatDistance(1.84)).toBe("1.8 km");
    expect(formatDistance(9.96)).toBe("10.0 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });
});

describe("isValidLatLng", () => {
  it("accepts real coordinates and rejects garbage", () => {
    expect(isValidLatLng({ lat: 9, lng: 38 })).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 0, lng: 181 })).toBe(false);
    expect(isValidLatLng({ lat: NaN, lng: 0 })).toBe(false);
  });
});
