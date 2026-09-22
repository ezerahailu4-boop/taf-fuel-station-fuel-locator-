import { ApiError } from "@/lib/api/errors";
import { requireStationAccess, type Actor } from "@/lib/auth/rbac";
import type { ActivityRepo } from "@/types/auth";

/**
 * Use this in EVERY admin/branch endpoint that touches a station.
 * Denied attempts are written to the audit log, then the 403 is re-thrown.
 */
export async function authorizeStationAccess(
  actor: Actor,
  stationId: string,
  opts: { write: boolean; ip?: string | null },
  activity: ActivityRepo,
): Promise<void> {
  try {
    requireStationAccess(actor, stationId, { write: opts.write });
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      await activity
        .log({
          actorUserId: actor.id,
          stationId,
          action: "ACCESS_DENIED",
          entity: "station",
          newValue: { attemptedWrite: opts.write, actorRole: actor.role, actorStationId: actor.stationId },
          ip: opts.ip ?? null,
        })
        .catch((logErr) => console.error("[audit] failed to record denied access", logErr));
    }
    throw err;
  }
}
