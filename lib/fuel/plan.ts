import { badRequest } from "@/lib/api/errors";
import type { FuelStatus, SettableFuelStatus, StationStatus } from "./enums";

export interface PlanInput {
  station: { id: string; isActive: boolean; status: StationStatus };
  fuelTypes: Map<string, { slug: string; isActive: boolean }>;
  current: Map<string, { status: FuelStatus; note: string | null; liters?: number | null }>;
  desired: {
    stationStatus?: StationStatus;
    fuels: Array<{ fuelTypeId: string; status: SettableFuelStatus; note?: string | null; liters?: number | null }>;
  };
}

export interface FuelChange {
  fuelTypeId: string;
  slug: string;
  oldStatus: FuelStatus;
  newStatus: FuelStatus;
  oldLiters: number | null;
  newLiters: number | null;
  oldNote: string | null;
  newNote: string | null;
  /** History rows are written only when the status itself changed (a note-only edit is not a status transition). */
  statusChanged: boolean;
  litersChanged: boolean;
}

export interface UpdatePlan {
  fuelChanges: FuelChange[];
  stationStatusChange: { old: StationStatus; new: StationStatus } | null;
}

const normNote = (n: string | null | undefined): string | null => {
  const t = n?.trim();
  return t ? t : null;
};

/**
 * Pure diff: given what exists and what the admin wants, decide exactly what to write.
 * No-op inputs (same status, same note, same liters) produce an EMPTY plan, so no history, log or notification is created.
 */
export function planUpdate(input: PlanInput): UpdatePlan {
  if (!input.station.isActive) throw badRequest("This station is inactive. Activate it before updating availability.");

  const seen = new Set<string>();
  const fuelChanges: FuelChange[] = [];

  for (const want of input.desired.fuels) {
    if (seen.has(want.fuelTypeId)) throw badRequest("Duplicate fuel type in update");
    seen.add(want.fuelTypeId);

    const ft = input.fuelTypes.get(want.fuelTypeId);
    if (!ft) throw badRequest("Unknown fuel type");
    if (!ft.isActive) throw badRequest(`Fuel type "${ft.slug}" is disabled`);

    const cur = input.current.get(want.fuelTypeId) ?? { status: "UNKNOWN" as FuelStatus, note: null, liters: null };
    const newNote = want.note === undefined ? cur.note : normNote(want.note);
    const newLiters = want.liters === undefined ? cur.liters : want.liters;
    const statusChanged = cur.status !== want.status;
    const litersChanged = cur.liters !== newLiters;
    if (!statusChanged && cur.note === newNote && !litersChanged) continue;

    fuelChanges.push({
      fuelTypeId: want.fuelTypeId,
      slug: ft.slug,
      oldStatus: cur.status,
      newStatus: want.status,
      oldLiters: cur.liters ?? null,
      newLiters: newLiters ?? null,
      oldNote: cur.note,
      newNote,
      statusChanged,
      litersChanged,
    });
  }

  const desiredStationStatus = input.desired.stationStatus;
  const stationStatusChange =
    desiredStationStatus && desiredStationStatus !== input.station.status
      ? { old: input.station.status, new: desiredStationStatus }
      : null;

  return { fuelChanges, stationStatusChange };
}
