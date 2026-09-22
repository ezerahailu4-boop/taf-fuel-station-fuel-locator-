import { badRequest } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/rbac";
import type { UpdatePlan } from "@/lib/fuel/plan";
import type { ActivityRepo } from "@/types/auth";
import type { AvailabilityUpdateInput } from "@/lib/validation/station";
import type { FuelStatusRepo, StatusChangeSink } from "@/types/stations";
import { authorizeStationAccess } from "./accessService";

export interface FuelStatusServiceDeps {
  repo: FuelStatusRepo;
  activity: ActivityRepo;
  sink: StatusChangeSink;
  now?: () => Date;
}

const clock = (d: FuelStatusServiceDeps) => (d.now ?? (() => new Date()))();

/** Branch admins default to their own station; everyone else must say which one. */
export function resolveStationId(actor: Actor, requested?: string): string {
  const id = requested ?? actor.stationId;
  if (!id) throw badRequest("stationId is required");
  return id;
}

export interface SaveAvailabilityResult {
  changed: boolean;
  plan: UpdatePlan;
}

/**
 * The single write path for fuel availability and station status.
 *   1. authorize (role + branch scope; denials audited)
 *   2. transaction: lock station, diff, upsert status, write history + activity log   (repo)
 *   3. notify the sink (real-time broadcast, cache invalidation, notification queue)   (best-effort)
 * A save that changes nothing writes nothing and emits nothing.
 */
export async function saveAvailability(
  d: FuelStatusServiceDeps,
  actor: Actor,
  input: AvailabilityUpdateInput,
  ip: string | null,
): Promise<SaveAvailabilityResult> {
  const stationId = resolveStationId(actor, input.stationId);
  await authorizeStationAccess(actor, stationId, { write: true, ip }, d.activity);

  const at = clock(d);
  const plan = await d.repo.applyUpdate({
    stationId,
    actorId: actor.id,
    at,
    ip,
    stationStatus: input.stationStatus,
    fuels: input.fuels,
  });

  const events: Promise<void>[] = [];
  for (const c of plan.fuelChanges) {
    if (!c.statusChanged) continue;
    events.push(
      d.sink.onFuelStatusChanged({
        stationId,
        fuelTypeId: c.fuelTypeId,
        fuelSlug: c.slug,
        oldStatus: c.oldStatus,
        newStatus: c.newStatus,
        actorId: actor.id,
        at,
      }),
    );
  }
  if (plan.stationStatusChange) {
    events.push(
      d.sink.onStationStatusChanged({
        stationId,
        oldStatus: plan.stationStatusChange.old,
        newStatus: plan.stationStatusChange.new,
        actorId: actor.id,
        at,
      }),
    );
  }
  // Side effects must never fail an already-committed update.
  const results = await Promise.allSettled(events);
  for (const r of results) if (r.status === "rejected") console.error("[fuel-status] sink failed", r.reason);

  return { changed: plan.fuelChanges.length > 0 || plan.stationStatusChange !== null, plan };
}

/** "Still accurate ✓": refreshes freshness without changing any status. */
export async function confirmAvailability(
  d: FuelStatusServiceDeps,
  actor: Actor,
  requestedStationId: string | undefined,
  ip: string | null,
): Promise<{ confirmedFuels: number }> {
  const stationId = resolveStationId(actor, requestedStationId);
  await authorizeStationAccess(actor, stationId, { write: true, ip }, d.activity);

  const at = clock(d);
  const confirmedFuels = await d.repo.confirm({ stationId, actorId: actor.id, at, ip });
  if (confirmedFuels > 0) {
    const r = await Promise.allSettled([d.sink.onAvailabilityConfirmed({ stationId, actorId: actor.id, at })]);
    for (const x of r) if (x.status === "rejected") console.error("[fuel-status] sink failed", x.reason);
  }
  return { confirmedFuels };
}
