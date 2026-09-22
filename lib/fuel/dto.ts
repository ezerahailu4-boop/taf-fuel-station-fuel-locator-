import { freshnessOf, resolveFuelDisplay } from "./display";
import type { FuelTypeRow, StationDTO, StationFuelDTO, StationRow } from "@/types/stations";

/**
 * Builds the customer-facing station shape. Every ACTIVE fuel type appears, even if the station never
 * reported it (status UNKNOWN, neverReported=true), so the UI never silently hides a fuel.
 */
export function buildStationDTO(
  row: StationRow,
  activeFuelTypes: FuelTypeRow[],
  now: Date,
  staleAfterMinutes: number,
): StationDTO {
  const byFuel = new Map(row.fuelStatuses.map((s) => [s.fuelTypeId, s]));
  let latest: Date | null = null;

  const fuels: StationFuelDTO[] = activeFuelTypes.map((ft) => {
    const s = byFuel.get(ft.id) ?? null;
    const display = resolveFuelDisplay(s, now, staleAfterMinutes);
    if (s) {
      const f = freshnessOf(s);
      if (!latest || f > latest) latest = f;
    }
    return {
      fuelTypeId: ft.id,
      slug: ft.slug,
      nameEn: ft.nameEn,
      nameAm: ft.nameAm,
      icon: ft.icon,
      status: display.status,
      note: s?.note ?? null,
      lastUpdated: s ? s.lastUpdated.toISOString() : null,
      lastConfirmedAt: s ? s.lastConfirmedAt.toISOString() : null,
      isStale: display.isStale,
      neverReported: display.neverReported,
    };
  });

  return {
    id: row.id,
    name: row.name,
    branchName: row.branchName,
    address: row.address,
    city: row.city,
    area: row.area,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    openingHours: row.openingHours,
    status: row.status,
    services: row.services,
    isActive: row.isActive,
    fuels,
    lastUpdated: latest ? (latest as Date).toISOString() : null,
  };
}
