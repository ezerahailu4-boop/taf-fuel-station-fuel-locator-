import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { canAccessStation, requireRole, requireStationAccess, type Actor } from "@/lib/auth/rbac";

const BOLE = "station-bole";
const SARIS = "station-saris";

const superAdmin: Actor = { id: "s", role: "SUPER_ADMIN", stationId: null };
const boleAdmin: Actor = { id: "b", role: "BRANCH_ADMIN", stationId: BOLE };
const orphanAdmin: Actor = { id: "o", role: "BRANCH_ADMIN", stationId: null };
const viewer: Actor = { id: "v", role: "VIEWER", stationId: null };
const customer: Actor = { id: "c", role: "CUSTOMER", stationId: null };

const status = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
  return 200;
};

describe("requireRole", () => {
  it("allows listed roles and rejects others with 403", () => {
    expect(status(() => requireRole(superAdmin, "SUPER_ADMIN"))).toBe(200);
    expect(status(() => requireRole(boleAdmin, "SUPER_ADMIN"))).toBe(403);
    expect(status(() => requireRole(customer, "BRANCH_ADMIN", "SUPER_ADMIN"))).toBe(403);
  });
});

describe("requireStationAccess (branch-level access control)", () => {
  it("super admin can read and write any station", () => {
    expect(canAccessStation(superAdmin, BOLE, true)).toBe(true);
    expect(canAccessStation(superAdmin, SARIS, true)).toBe(true);
  });

  it("branch admin can read and write ONLY their own station", () => {
    expect(canAccessStation(boleAdmin, BOLE, true)).toBe(true);
    expect(canAccessStation(boleAdmin, BOLE, false)).toBe(true);
    expect(status(() => requireStationAccess(boleAdmin, SARIS, { write: true }))).toBe(403);
    expect(status(() => requireStationAccess(boleAdmin, SARIS, { write: false }))).toBe(403);
  });

  it("branch admin with no assigned station can access nothing", () => {
    expect(canAccessStation(orphanAdmin, BOLE, false)).toBe(false);
    expect(canAccessStation(orphanAdmin, "null", true)).toBe(false);
  });

  it("viewer can read any station but never write", () => {
    expect(canAccessStation(viewer, BOLE, false)).toBe(true);
    expect(canAccessStation(viewer, SARIS, false)).toBe(true);
    expect(canAccessStation(viewer, BOLE, true)).toBe(false);
  });

  it("customer has no admin access at all", () => {
    expect(canAccessStation(customer, BOLE, false)).toBe(false);
    expect(canAccessStation(customer, BOLE, true)).toBe(false);
  });
});
