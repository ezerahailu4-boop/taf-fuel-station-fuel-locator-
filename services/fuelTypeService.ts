import { notFound } from "@/lib/api/errors";
import { requireRole, type Actor } from "@/lib/auth/rbac";
import type { ActivityRepo } from "@/types/auth";
import type { FuelTypeRepo, FuelTypeRow } from "@/types/stations";

export interface FuelTypeServiceDeps {
  fuelTypes: FuelTypeRepo;
  activity: ActivityRepo;
}

export const listFuelTypes = (d: FuelTypeServiceDeps, includeInactive: boolean) => d.fuelTypes.list({ includeInactive });

export async function createFuelType(
  d: FuelTypeServiceDeps,
  actor: Actor,
  input: Omit<FuelTypeRow, "id">,
  ip: string | null,
): Promise<FuelTypeRow> {
  requireRole(actor, "SUPER_ADMIN");
  const row = await d.fuelTypes.create(input);
  await d.activity.log({ actorUserId: actor.id, stationId: null, action: "FUEL_TYPE_CREATED", entity: "fuel_type", newValue: row, ip });
  return row;
}

export async function updateFuelType(
  d: FuelTypeServiceDeps,
  actor: Actor,
  id: string,
  patch: Partial<Omit<FuelTypeRow, "id">>,
  ip: string | null,
): Promise<FuelTypeRow> {
  requireRole(actor, "SUPER_ADMIN");
  const before = await d.fuelTypes.findById(id);
  if (!before) throw notFound("Fuel type not found");
  const after = await d.fuelTypes.update(id, patch);
  if (!after) throw notFound("Fuel type not found");

  const changed = (Object.keys(patch) as Array<keyof FuelTypeRow>).filter((k) => before[k] !== after[k]);
  if (changed.length > 0) {
    await d.activity.log({
      actorUserId: actor.id,
      stationId: null,
      action: after.isActive === false && before.isActive ? "FUEL_TYPE_DISABLED" : "FUEL_TYPE_UPDATED",
      entity: "fuel_type",
      oldValue: Object.fromEntries(changed.map((k) => [k, before[k]])),
      newValue: Object.fromEntries(changed.map((k) => [k, after[k]])),
      ip,
    });
  }
  return after;
}
