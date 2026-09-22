import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { planUpdate, type PlanInput } from "@/lib/fuel/plan";

const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  station: { id: "s", isActive: true, status: "OPEN" },
  fuelTypes: new Map([
    ["b", { slug: "benzine", isActive: true }],
    ["d", { slug: "diesel", isActive: true }],
    ["x", { slug: "old", isActive: false }],
  ]),
  current: new Map([["d", { status: "OUT_OF_STOCK" as const, note: null }]]),
  desired: { fuels: [] },
  ...over,
});

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
  return 0;
};

describe("planUpdate", () => {
  it("produces an EMPTY plan for a no-op (same status, same note)", () => {
    const plan = planUpdate(base({ desired: { stationStatus: "OPEN", fuels: [{ fuelTypeId: "d", status: "OUT_OF_STOCK" }] } }));
    expect(plan.fuelChanges).toEqual([]);
    expect(plan.stationStatusChange).toBeNull();
  });

  it("records old → new for a real transition", () => {
    const plan = planUpdate(base({ desired: { fuels: [{ fuelTypeId: "d", status: "AVAILABLE" }] } }));
    expect(plan.fuelChanges).toEqual([
      { fuelTypeId: "d", slug: "diesel", oldStatus: "OUT_OF_STOCK", newStatus: "AVAILABLE", oldNote: null, newNote: null, statusChanged: true },
    ]);
  });

  it("a fuel never reported before transitions from UNKNOWN", () => {
    const plan = planUpdate(base({ desired: { fuels: [{ fuelTypeId: "b", status: "LIMITED" }] } }));
    expect(plan.fuelChanges[0]).toMatchObject({ oldStatus: "UNKNOWN", newStatus: "LIMITED", statusChanged: true });
  });

  it("a note-only edit is a change but NOT a status transition", () => {
    const plan = planUpdate(base({ desired: { fuels: [{ fuelTypeId: "d", status: "OUT_OF_STOCK", note: " Delivery at 3pm " }] } }));
    expect(plan.fuelChanges[0]).toMatchObject({ statusChanged: false, newNote: "Delivery at 3pm" });
  });

  it("an omitted note keeps the existing note; a blank note clears it", () => {
    const withNote = base({ current: new Map([["d", { status: "LIMITED" as const, note: "queue" }]]) });
    expect(planUpdate({ ...withNote, desired: { fuels: [{ fuelTypeId: "d", status: "LIMITED" }] } }).fuelChanges).toEqual([]);
    const cleared = planUpdate({ ...withNote, desired: { fuels: [{ fuelTypeId: "d", status: "LIMITED", note: "  " }] } });
    expect(cleared.fuelChanges[0]).toMatchObject({ oldNote: "queue", newNote: null, statusChanged: false });
  });

  it("detects a station status change independently of fuel", () => {
    const plan = planUpdate(base({ desired: { stationStatus: "MAINTENANCE", fuels: [] } }));
    expect(plan.stationStatusChange).toEqual({ old: "OPEN", new: "MAINTENANCE" });
  });

  it("rejects inactive stations, unknown fuels, disabled fuels and duplicates (400)", () => {
    expect(code(() => planUpdate(base({ station: { id: "s", isActive: false, status: "OPEN" } })))).toBe(400);
    expect(code(() => planUpdate(base({ desired: { fuels: [{ fuelTypeId: "nope", status: "AVAILABLE" }] } })))).toBe(400);
    expect(code(() => planUpdate(base({ desired: { fuels: [{ fuelTypeId: "x", status: "AVAILABLE" }] } })))).toBe(400);
    expect(
      code(() =>
        planUpdate(base({ desired: { fuels: [{ fuelTypeId: "b", status: "AVAILABLE" }, { fuelTypeId: "b", status: "LIMITED" }] } })),
      ),
    ).toBe(400);
  });
});
