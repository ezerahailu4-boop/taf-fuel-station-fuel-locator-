export const FUEL_STATUSES = ["AVAILABLE", "LIMITED", "OUT_OF_STOCK", "UNKNOWN"] as const;
export type FuelStatus = (typeof FUEL_STATUSES)[number];

/** Statuses a branch admin can set. UNKNOWN is derived (never reported / stale), never chosen. */
export const SETTABLE_FUEL_STATUSES = ["AVAILABLE", "LIMITED", "OUT_OF_STOCK"] as const;
export type SettableFuelStatus = (typeof SETTABLE_FUEL_STATUSES)[number];

export const STATION_STATUSES = ["OPEN", "CLOSED", "TEMPORARILY_CLOSED", "MAINTENANCE"] as const;
export type StationStatus = (typeof STATION_STATUSES)[number];
