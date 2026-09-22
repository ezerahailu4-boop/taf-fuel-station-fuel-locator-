import { forbidden } from "@/lib/api/errors";

export type Role = "CUSTOMER" | "VIEWER" | "BRANCH_ADMIN" | "SUPER_ADMIN";

/** The authenticated actor, ALWAYS built from the database, never from client-supplied data. */
export interface Actor {
  id: string;
  role: Role;
  stationId: string | null;
}

export const STAFF_ROLES: readonly Role[] = ["VIEWER", "BRANCH_ADMIN", "SUPER_ADMIN"];
export const isStaff = (role: Role) => STAFF_ROLES.includes(role);

export function requireRole(actor: Actor, ...allowed: Role[]): void {
  if (!allowed.includes(actor.role)) throw forbidden();
}

export interface StationAccessOptions {
  /** true for anything that modifies data. Viewers can never write. */
  write: boolean;
}

/**
 * Branch-level access control.
 *  - SUPER_ADMIN: any station, read + write
 *  - BRANCH_ADMIN: only their assigned station, read + write
 *  - VIEWER: any station, read only
 *  - CUSTOMER: none
 */
export function requireStationAccess(actor: Actor, stationId: string, opts: StationAccessOptions): void {
  switch (actor.role) {
    case "SUPER_ADMIN":
      return;
    case "BRANCH_ADMIN":
      if (actor.stationId !== null && actor.stationId === stationId) return;
      throw forbidden();
    case "VIEWER":
      if (!opts.write) return;
      throw forbidden();
    default:
      throw forbidden();
  }
}

export function canAccessStation(actor: Actor, stationId: string, write: boolean): boolean {
  try {
    requireStationAccess(actor, stationId, { write });
    return true;
  } catch {
    return false;
  }
}
