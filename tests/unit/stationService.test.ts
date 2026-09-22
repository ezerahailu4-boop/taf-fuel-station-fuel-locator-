import { describe, expect, it } from "vitest";
import type { Actor } from "@/lib/auth/rbac";
import { activityDepsFor } from "../helpers/svc";
import { listActivity } from "@/services/activityService";
import { createFuelType, updateFuelType } from "@/services/fuelTypeService";
import {
  assignStationAdmin,
  createStation,
  deleteStation,
  getPublicStation,
  getStationForStaff,
  listPublicStations,
  updateStation,
  type StationServiceDeps,
} from "@/services/stationService";
import { FakeActivityRepo } from "../helpers/fakes";
import { FUEL_BENZINE, FUEL_DIESEL, FakeActivityReadRepo, FakeFuelTypeRepo, FakeSettingsRepo, FakeStationRepo, makeStation } from "../helpers/fakes2";

const NOW = new Date("2026-09-21T12:00:00Z");
const superAdmin: Actor = { id: "root", role: "SUPER_ADMIN", stationId: null };
const boleAdmin: Actor = { id: "b", role: "BRANCH_ADMIN", stationId: "st-bole" };
const viewer: Actor = { id: "v", role: "VIEWER", stationId: null };
const customer: Actor = { id: "c", role: "CUSTOMER", stationId: null };

const newStation = { name: "TAF", branchName: "Kaliti", address: "Kaliti", city: "Addis Ababa", latitude: 8.9, longitude: 38.77, area: null, phone: null, openingHours: { is24h: true as const }, status: "OPEN" as const, services: [], isActive: true };

function setup(settings: Record<string, unknown> = {}) {
  const stations = new FakeStationRepo([
    makeStation({ id: "st-bole", fuelStatuses: [{ fuelTypeId: FUEL_BENZINE.id, status: "AVAILABLE", note: null, lastUpdated: new Date(NOW.getTime() - 300 * 60_000), lastConfirmedAt: new Date(NOW.getTime() - 300 * 60_000) }] }),
    makeStation({ id: "st-off", branchName: "Old", isActive: false }),
  ]);
  const activity = new FakeActivityRepo();
  const deps: StationServiceDeps = { stations, fuelTypes: new FakeFuelTypeRepo([FUEL_BENZINE, FUEL_DIESEL]), settings: new FakeSettingsRepo(settings), activity, now: () => NOW };
  return { deps, stations, activity };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { status?: number }).status ?? -1;
  }
  return 200;
};

describe("public reads", () => {
  it("lists only ACTIVE stations, with every active fuel type and staleness from settings", async () => {
    const { deps } = setup({ stale_after_minutes: 120 });
    const page = await listPublicStations(deps, { page: 1, pageSize: 20 });
    expect(page.items.map((s) => s.id)).toEqual(["st-bole"]);
    const fuels = page.items[0]!.fuels;
    expect(fuels.map((f) => f.slug)).toEqual(["benzine", "diesel"]);
    expect(fuels[0]).toMatchObject({ status: "AVAILABLE", isStale: true }); // 300 min old > 120
    expect(fuels[1]).toMatchObject({ status: "UNKNOWN", neverReported: true });
  });
  it("respects a configurable stale threshold", async () => {
    const { deps } = setup({ stale_after_minutes: 600 });
    expect((await listPublicStations(deps, { page: 1, pageSize: 20 })).items[0]!.fuels[0]!.isStale).toBe(false);
  });
  it("hides inactive/missing stations from the public (404)", async () => {
    const { deps } = setup();
    expect(await code(getPublicStation(deps, "st-off"))).toBe(404);
    expect(await code(getPublicStation(deps, "nope"))).toBe(404);
    expect((await getPublicStation(deps, "st-bole")).id).toBe("st-bole");
  });
});

describe("staff station read", () => {
  it("branch admin sees own station (even inactive is allowed by scope) but not others", async () => {
    const { deps, activity } = setup();
    expect((await getStationForStaff(deps, boleAdmin, "st-bole", null)).id).toBe("st-bole");
    expect(await code(getStationForStaff(deps, boleAdmin, "st-off", "1.1.1.1"))).toBe(403);
    expect(activity.entries[0]).toMatchObject({ action: "ACCESS_DENIED", stationId: "st-off" });
  });
  it("viewer can read, customer cannot", async () => {
    const { deps } = setup();
    expect((await getStationForStaff(deps, viewer, "st-off", null)).id).toBe("st-off");
    expect(await code(getStationForStaff(deps, customer, "st-bole", null))).toBe(403);
  });
});

describe("station management (Super Admin only)", () => {
  it("only Super Admin can create / update / delete / assign", async () => {
    const { deps } = setup();
    for (const actor of [boleAdmin, viewer, customer]) {
      expect(await code(createStation(deps, actor, newStation, null))).toBe(403);
      expect(await code(updateStation(deps, actor, "st-bole", { isActive: false }, null))).toBe(403);
      expect(await code(deleteStation(deps, actor, "st-bole", null))).toBe(403);
      expect(await code(assignStationAdmin(deps, actor, "st-bole", { telegramUserId: "1" }, null))).toBe(403);
    }
  });

  it("create logs STATION_CREATED", async () => {
    const { deps, activity } = setup();
    const dto = await createStation(deps, superAdmin, newStation, "2.2.2.2");
    expect(dto.branchName).toBe("Kaliti");
    expect(activity.entries[0]).toMatchObject({ action: "STATION_CREATED", actorUserId: "root", ip: "2.2.2.2" });
  });

  it("update logs ONLY the changed fields; a no-op update logs nothing", async () => {
    const { deps, activity } = setup();
    await updateStation(deps, superAdmin, "st-bole", { phone: "+251911000000", city: "Addis Ababa" }, null);
    expect(activity.entries).toHaveLength(1);
    expect(activity.entries[0]).toMatchObject({ action: "STATION_UPDATED", oldValue: { phone: null }, newValue: { phone: "+251911000000" } });
    await updateStation(deps, superAdmin, "st-bole", { city: "Addis Ababa" }, null);
    expect(activity.entries).toHaveLength(1);
  });

  it("update/delete of a missing station is 404", async () => {
    const { deps } = setup();
    expect(await code(updateStation(deps, superAdmin, "nope", { isActive: false }, null))).toBe(404);
    expect(await code(deleteStation(deps, superAdmin, "nope", null))).toBe(404);
  });

  it("delete keeps a full snapshot in the audit log", async () => {
    const { deps, activity, stations } = setup();
    await deleteStation(deps, superAdmin, "st-bole", null);
    expect(stations.rows.has("st-bole")).toBe(false);
    expect(activity.entries[0]).toMatchObject({ action: "STATION_DELETED", oldValue: { id: "st-bole", branchName: "Bole" } });
  });

  it("assign admin: 404 for unknown station, 400 for a Super Admin account, audit on success", async () => {
    const { deps, stations, activity } = setup();
    stations.assignResult = "station_not_found";
    expect(await code(assignStationAdmin(deps, superAdmin, "x", { telegramUserId: "5" }, null))).toBe(404);
    stations.assignResult = "is_super_admin";
    expect(await code(assignStationAdmin(deps, superAdmin, "st-bole", { telegramUserId: "5" }, null))).toBe(400);
    stations.assignResult = { userId: "u9", created: true };
    await assignStationAdmin(deps, superAdmin, "st-bole", { telegramUserId: "5" }, null);
    expect(activity.entries.at(-1)).toMatchObject({ action: "BRANCH_ADMIN_ASSIGNED", stationId: "st-bole" });
  });
});

describe("fuel type management (Super Admin only)", () => {
  it("creates, updates and audits; others get 403; disabling is logged distinctly", async () => {
    const activity = new FakeActivityRepo();
    const d = { fuelTypes: new FakeFuelTypeRepo([FUEL_BENZINE]), activity };
    expect(await code(createFuelType(d, boleAdmin, { slug: "premium", nameEn: "P", nameAm: "P", icon: "⛽", isActive: true, displayOrder: 3 }, null))).toBe(403);
    const created = await createFuelType(d, superAdmin, { slug: "premium", nameEn: "Premium", nameAm: "ፕሪሚየም", icon: "⛽", isActive: true, displayOrder: 3 }, null);
    await updateFuelType(d, superAdmin, created.id, { isActive: false }, null);
    expect(activity.entries.map((e) => e.action)).toEqual(["FUEL_TYPE_CREATED", "FUEL_TYPE_DISABLED"]);
    expect(await code(updateFuelType(d, superAdmin, "nope", { nameEn: "x" }, null))).toBe(404);
  });
});

describe("activity history scoping", () => {
  it("branch admin is forced to their own station; other stations are 403 + audited", async () => {
    const read = new FakeActivityReadRepo();
    const activity = new FakeActivityRepo();
    const d = activityDepsFor(read, activity);
    await listActivity(d, boleAdmin, { page: 1, pageSize: 30 }, null);
    expect(read.lastFilter).toMatchObject({ stationId: "st-bole" });
    expect(await code(listActivity(d, boleAdmin, { stationId: "st-saris", page: 1, pageSize: 30 }, null))).toBe(403);
    expect(activity.entries[0]).toMatchObject({ action: "ACCESS_DENIED", stationId: "st-saris" });
  });
  it("super admin may query everything; customers are refused", async () => {
    const read = new FakeActivityReadRepo();
    const d = activityDepsFor(read, new FakeActivityRepo());
    await listActivity(d, superAdmin, { page: 1, pageSize: 30 }, null);
    expect((read.lastFilter as { stationId?: string }).stationId).toBeUndefined();
    expect(await code(listActivity(d, customer, { page: 1, pageSize: 30 }, null))).toBe(403);
  });
});
