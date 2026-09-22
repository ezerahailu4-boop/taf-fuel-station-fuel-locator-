import { forbidden } from "@/lib/api/errors";
import { isStaff, type Actor } from "@/lib/auth/rbac";
import type { ActivityRepo } from "@/types/auth";
import type { ActivityReadRepo, Page, ActivityDTO } from "@/types/stations";
import { authorizeStationAccess } from "./accessService";

export interface ActivityServiceDeps {
  read: ActivityReadRepo;
  activity: ActivityRepo;
}

/**
 * Activity history.
 *  - Branch admin: only their own station (asking for another station is a 403 and is audited).
 *  - Super admin / viewer: any station, or everything when no station is given.
 */
export async function listActivity(
  d: ActivityServiceDeps,
  actor: Actor,
  q: { stationId?: string; action?: string; page: number; pageSize: number },
  ip: string | null,
): Promise<Page<ActivityDTO>> {
  if (!isStaff(actor.role)) throw forbidden();

  let stationId = q.stationId;
  if (actor.role === "BRANCH_ADMIN") {
    stationId = stationId ?? actor.stationId ?? undefined;
    if (!stationId) throw forbidden();
  }
  if (stationId) await authorizeStationAccess(actor, stationId, { write: false, ip }, d.activity);

  return d.read.list({ stationId, action: q.action, page: q.page, pageSize: q.pageSize });
}
