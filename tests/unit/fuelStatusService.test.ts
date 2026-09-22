import { describe, expect, it } from "vitest";
import type { Actor } from "@/lib/auth/rbac";
import { confirmAvailability, resolveStationId, saveAvailability, type FuelStatusServiceDeps } from "@/services/fuelStatusService";
import { FakeActivityRepo } from "../helpers/fakes";
import { FUEL_BENZINE, FUEL_DIESEL, FUEL_OFF, FakeFuelStatusRepo, FakeFuelTypeRepo, FakeStationRepo, RecordingSink, makeStation } from "../helpers/fakes2";

const BOLE = "st-bole";
const SARIS = "st-saris";
const NOW = new Date("2026-09-21T09:32:00Z");

const boleAdmin: Actor = { id: "bole-admin", role: "BRANCH_ADMIN", stationId: BOLE };
const superAdmin: Actor = { id: "root", role: "SUPER_ADMIN", stationId: null };
const viewer: Actor = { id: "v", role: "VIEWER", stationId: null };
const customer: Actor = { id: "c", role: "CUSTOMER", stationId: null };

function setup() {
  const stations = new FakeStationRepo([makeStation({ id: BOLE }), makeStation({ id: SARIS, branchName: "Saris" })]);
  const fuelTypes = new FakeFuelTypeRepo([FUEL_BENZINE, FUEL_DIESEL, FUEL_OFF]);
  const repo = new FakeFuelStatusRepo(stations, fuelTypes);
  const activity = new FakeActivityRepo();
  const sink = new RecordingSink();
  const deps: FuelStatusServiceDeps = { repo, activity, sink, now: () => NOW };
  return { deps, repo, activity, sink, stations };
}

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { status?: number }).status ?? -1;
  }
  return 200;
};

describe("saveAvailability", () => {
  it("branch admin updates their own station: history written, one event per real change", async () => {
    const { deps, repo, sink } = setup();
    const res = await saveAvailability(
      deps,
      boleAdmin,
      { fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" }, { fuelTypeId: FUEL_BENZINE.id, status: "OUT_OF_STOCK" }] },
      "1.1.1.1",
    );
    expect(res.changed).toBe(true);
    expect(repo.history.map((h) => [h.fuelTypeId, h.oldStatus, h.newStatus, h.changedBy])).toEqual([
      [FUEL_DIESEL.id, "UNKNOWN", "AVAILABLE", "bole-admin"],
      [FUEL_BENZINE.id, "UNKNOWN", "OUT_OF_STOCK", "bole-admin"],
    ]);
    expect(sink.fuel).toHaveLength(2);
    expect(sink.fuel[0]).toMatchObject({ stationId: BOLE, fuelSlug: "diesel", oldStatus: "UNKNOWN", newStatus: "AVAILABLE", actorId: "bole-admin", at: NOW });
  });

  it("OFF → ON emits exactly the OUT_OF_STOCK → AVAILABLE transition", async () => {
    const { deps, sink } = setup();
    await saveAvailability(deps, boleAdmin, { fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "OUT_OF_STOCK" }] }, null);
    sink.fuel.length = 0;
    await saveAvailability(deps, boleAdmin, { fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" }] }, null);
    expect(sink.fuel).toHaveLength(1);
    expect(sink.fuel[0]).toMatchObject({ oldStatus: "OUT_OF_STOCK", newStatus: "AVAILABLE" });
  });

  it("a no-op save writes no history and emits NO events (so no notification spam)", async () => {
    const { deps, repo, sink } = setup();
    await saveAvailability(deps, boleAdmin, { fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "LIMITED" }] }, null);
    sink.fuel.length = 0;
    const histBefore = repo.history.length;
    const res = await saveAvailability(deps, boleAdmin, { fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "LIMITED" }] }, null);
    expect(res.changed).toBe(false);
    expect(repo.history.length).toBe(histBefore);
    expect(sink.fuel).toHaveLength(0);
  });

  it("emits a station-status event when the station status changes", async () => {
    const { deps, sink } = setup();
    await saveAvailability(deps, boleAdmin, { stationStatus: "MAINTENANCE", fuels: [] }, null);
    expect(sink.station).toEqual([{ stationId: BOLE, oldStatus: "OPEN", newStatus: "MAINTENANCE", actorId: "bole-admin", at: NOW }]);
  });

  it("BRANCH ISOLATION: a Bole admin cannot touch Saris (403), nothing is written, denial is audited", async () => {
    const { deps, repo, sink, activity } = setup();
    const code = await status(saveAvailability(deps, boleAdmin, { stationId: SARIS, fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" }] }, "9.9.9.9"));
    expect(code).toBe(403);
    expect(repo.applyCalls).toBe(0);
    expect(sink.fuel).toHaveLength(0);
    expect(activity.entries).toHaveLength(1);
    expect(activity.entries[0]).toMatchObject({ action: "ACCESS_DENIED", stationId: SARIS, actorUserId: "bole-admin", ip: "9.9.9.9" });
  });

  it("viewers and customers can never write (403)", async () => {
    const { deps, repo } = setup();
    const body = { stationId: BOLE, fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" as const }] };
    expect(await status(saveAvailability(deps, viewer, body, null))).toBe(403);
    expect(await status(saveAvailability(deps, customer, body, null))).toBe(403);
    expect(repo.applyCalls).toBe(0);
  });

  it("super admin can update any station but must say which", async () => {
    const { deps } = setup();
    const fuels = [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" as const }];
    expect(await status(saveAvailability(deps, superAdmin, { stationId: SARIS, fuels }, null))).toBe(200);
    expect(await status(saveAvailability(deps, superAdmin, { fuels }, null))).toBe(400);
  });

  it("rejects disabled fuel types and unknown stations", async () => {
    const { deps } = setup();
    expect(await status(saveAvailability(deps, boleAdmin, { fuels: [{ fuelTypeId: FUEL_OFF.id, status: "AVAILABLE" }] }, null))).toBe(400);
    expect(await status(saveAvailability(deps, superAdmin, { stationId: "nope", fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" }] }, null))).toBe(404);
  });

  it("a failing side-effect sink never fails the committed update", async () => {
    const { deps, sink, repo } = setup();
    sink.failWith = new Error("realtime down");
    const res = await saveAvailability(deps, boleAdmin, { fuels: [{ fuelTypeId: FUEL_DIESEL.id, status: "AVAILABLE" }] }, null);
    expect(res.changed).toBe(true);
    expect(repo.history).toHaveLength(1);
  });
});

describe("confirmAvailability ('Still accurate ✓')", () => {
  it("confirms own station and emits one event", async () => {
    const { deps, sink } = setup();
    expect(await confirmAvailability(deps, boleAdmin, undefined, null)).toEqual({ confirmedFuels: 2 });
    expect(sink.confirmed).toEqual([{ stationId: BOLE, actorId: "bole-admin", at: NOW }]);
  });
  it("emits nothing when there was nothing to confirm", async () => {
    const { deps, repo, sink } = setup();
    repo.confirmCount = 0;
    await confirmAvailability(deps, boleAdmin, undefined, null);
    expect(sink.confirmed).toHaveLength(0);
  });
  it("cannot confirm another branch (403 + audited)", async () => {
    const { deps, activity } = setup();
    expect(await status(confirmAvailability(deps, boleAdmin, SARIS, null))).toBe(403);
    expect(activity.entries[0]).toMatchObject({ action: "ACCESS_DENIED", stationId: SARIS });
  });
});

describe("resolveStationId", () => {
  it("defaults branch admins to their station and requires an id otherwise", () => {
    expect(resolveStationId(boleAdmin)).toBe(BOLE);
    expect(resolveStationId(superAdmin, "x")).toBe("x");
    expect(() => resolveStationId(superAdmin)).toThrow();
  });
});
