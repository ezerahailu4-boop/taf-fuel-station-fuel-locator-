import { describe, expect, it } from "vitest";
import {
  availabilityUpdateSchema,
  fuelTypeCreateSchema,
  openingHoursSchema,
  stationCreateSchema,
  stationListQuerySchema,
  stationUpdateSchema,
} from "@/lib/validation/station";

const uuid = "7b7d3a5e-2a4b-4c1c-9d27-0d3c9c9a1111";
const validStation = { name: "TAF", branchName: "Bole", address: "Bole", city: "Addis Ababa", latitude: 9, longitude: 38.7 };

describe("station validation", () => {
  it("applies sensible defaults on create", () => {
    const s = stationCreateSchema.parse(validStation);
    expect(s).toMatchObject({ status: "OPEN", isActive: true, services: [], openingHours: { is24h: true }, phone: null });
  });
  it("rejects out-of-range coordinates", () => {
    for (const bad of [{ latitude: 91 }, { latitude: -91 }, { longitude: 181 }, { longitude: -181 }, { latitude: NaN }]) {
      expect(stationCreateSchema.safeParse({ ...validStation, ...bad }).success).toBe(false);
    }
    expect(stationCreateSchema.safeParse({ ...validStation, latitude: 90, longitude: -180 }).success).toBe(true);
  });
  it("rejects string coordinates (no silent coercion)", () => {
    expect(stationCreateSchema.safeParse({ ...validStation, latitude: "9.0" }).success).toBe(false);
  });
  it("validates phone numbers and trims text", () => {
    expect(stationCreateSchema.safeParse({ ...validStation, phone: "+251 911 000 000" }).success).toBe(true);
    expect(stationCreateSchema.safeParse({ ...validStation, phone: "<script>" }).success).toBe(false);
    expect(stationCreateSchema.parse({ ...validStation, name: "  TAF  " }).name).toBe("TAF");
    expect(stationCreateSchema.safeParse({ ...validStation, name: "   " }).success).toBe(false);
  });
  it("rejects unknown status values", () => {
    expect(stationCreateSchema.safeParse({ ...validStation, status: "BROKEN" }).success).toBe(false);
  });
  it("update requires at least one field", () => {
    expect(stationUpdateSchema.safeParse({}).success).toBe(false);
    expect(stationUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});

describe("opening hours", () => {
  it("accepts 24h and per-day ranges", () => {
    expect(openingHoursSchema.safeParse({ is24h: true }).success).toBe(true);
    expect(openingHoursSchema.safeParse({ mon: [["06:00", "22:00"]], sun: [["08:00", "18:30"]] }).success).toBe(true);
  });
  it("rejects bad times, unknown keys and empty objects", () => {
    expect(openingHoursSchema.safeParse({ mon: [["6:00", "22:00"]] }).success).toBe(false);
    expect(openingHoursSchema.safeParse({ mon: [["06:00", "25:00"]] }).success).toBe(false);
    expect(openingHoursSchema.safeParse({ funday: [["06:00", "22:00"]] }).success).toBe(false);
    expect(openingHoursSchema.safeParse({}).success).toBe(false);
  });
});

describe("availability update body", () => {
  it("accepts AVAILABLE / LIMITED / OUT_OF_STOCK", () => {
    for (const status of ["AVAILABLE", "LIMITED", "OUT_OF_STOCK"]) {
      expect(availabilityUpdateSchema.safeParse({ fuels: [{ fuelTypeId: uuid, status }] }).success).toBe(true);
    }
  });
  it("refuses UNKNOWN (derived, never chosen), bad ids and empty updates", () => {
    expect(availabilityUpdateSchema.safeParse({ fuels: [{ fuelTypeId: uuid, status: "UNKNOWN" }] }).success).toBe(false);
    expect(availabilityUpdateSchema.safeParse({ fuels: [{ fuelTypeId: "abc", status: "AVAILABLE" }] }).success).toBe(false);
    expect(availabilityUpdateSchema.safeParse({}).success).toBe(false);
  });
  it("allows a station-status-only update and caps note length", () => {
    expect(availabilityUpdateSchema.safeParse({ stationStatus: "CLOSED" }).success).toBe(true);
    expect(availabilityUpdateSchema.safeParse({ fuels: [{ fuelTypeId: uuid, status: "LIMITED", note: "x".repeat(201) }] }).success).toBe(false);
  });
});

describe("fuel type + list query validation", () => {
  it("enforces slug format", () => {
    expect(fuelTypeCreateSchema.safeParse({ slug: "premium-95", nameEn: "Premium", nameAm: "ፕሪሚየም" }).success).toBe(true);
    for (const slug of ["Premium", "a b", "-x", "x-", "x--y", ""]) {
      expect(fuelTypeCreateSchema.safeParse({ slug, nameEn: "P", nameAm: "P" }).success).toBe(false);
    }
  });
  it("caps page size and coerces numeric query strings", () => {
    expect(stationListQuerySchema.parse({ page: "2", pageSize: "10" })).toMatchObject({ page: 2, pageSize: 10 });
    expect(stationListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
    expect(stationListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20 });
  });
});
