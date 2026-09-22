import type { FuelStatus, SettableFuelStatus, StationStatus } from "@/lib/fuel/enums";
import type { UpdatePlan } from "@/lib/fuel/plan";
import type { StationCreateInput, StationUpdateInput } from "@/lib/validation/station";

// ---------- Rows (what repositories return) ----------
export interface FuelTypeRow {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
}

export interface FuelStatusRow {
  fuelTypeId: string;
  status: FuelStatus;
  note: string | null;
  lastUpdated: Date;
  lastConfirmedAt: Date;
}

export interface StationRow {
  id: string;
  name: string;
  branchName: string;
  address: string;
  city: string;
  area: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  openingHours: unknown;
  status: StationStatus;
  services: string[];
  isActive: boolean;
  fuelStatuses: FuelStatusRow[];
}

// ---------- DTOs (what the API returns) ----------
export interface StationFuelDTO {
  fuelTypeId: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  icon: string;
  status: FuelStatus;
  note: string | null;
  lastUpdated: string | null;
  lastConfirmedAt: string | null;
  isStale: boolean;
  neverReported: boolean;
}

export interface StationDTO {
  id: string;
  name: string;
  branchName: string;
  address: string;
  city: string;
  area: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  openingHours: unknown;
  status: StationStatus;
  services: string[];
  isActive: boolean;
  fuels: StationFuelDTO[];
  /** Most recent freshness across all fuels, or null if nothing was ever reported. */
  lastUpdated: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivityDTO {
  id: string;
  createdAt: string;
  action: string;
  entity: string;
  oldValue: unknown;
  newValue: unknown;
  actor: { id: string; firstName: string; lastName: string | null } | null;
  station: { id: string; branchName: string } | null;
}

// ---------- Repository interfaces ----------
export interface StationListFilter {
  q?: string;
  city?: string;
  area?: string;
  status?: StationStatus;
  includeInactive: boolean;
  page: number;
  pageSize: number;
}

export type StationData = Omit<StationCreateInput, never>;

export interface StationRepo {
  list(filter: StationListFilter): Promise<{ items: StationRow[]; total: number }>;
  /** Active stations inside a lat/lng rectangle (index-friendly prefilter for nearby search). */
  listInBox(box: { minLat: number; maxLat: number; minLng: number; maxLng: number }, limit: number): Promise<StationRow[]>;
  findById(id: string): Promise<StationRow | null>;
  create(data: StationCreateInput): Promise<StationRow>;
  update(id: string, data: StationUpdateInput): Promise<StationRow | null>;
  delete(id: string): Promise<boolean>;
  /** Makes the Telegram user a BRANCH_ADMIN of the station (creating a placeholder user if they never opened the bot). */
  assignAdmin(
    stationId: string,
    telegramUserId: bigint,
    firstName: string,
  ): Promise<{ userId: string; created: boolean } | "station_not_found" | "is_super_admin">;
}

export interface FuelTypeRepo {
  list(opts: { includeInactive: boolean }): Promise<FuelTypeRow[]>;
  findById(id: string): Promise<FuelTypeRow | null>;
  create(data: Omit<FuelTypeRow, "id">): Promise<FuelTypeRow>;
  update(id: string, data: Partial<Omit<FuelTypeRow, "id">>): Promise<FuelTypeRow | null>;
}

export interface SettingsRepo {
  getMany(keys: string[]): Promise<Record<string, unknown>>;
  getAll?(): Promise<Record<string, unknown>>;
  setMany?(updates: Record<string, unknown>): Promise<void>;
}

export interface ApplyUpdateInput {
  stationId: string;
  actorId: string;
  at: Date;
  ip: string | null;
  stationStatus?: StationStatus;
  fuels: Array<{ fuelTypeId: string; status: SettableFuelStatus; note?: string | null }>;
}

export interface FuelStatusRepo {
  /** One transaction: lock station, diff, upsert rows, write history + activity logs. Returns what actually changed. */
  applyUpdate(input: ApplyUpdateInput): Promise<UpdatePlan>;
  /** Marks all active fuel rows as re-confirmed. Returns how many rows were confirmed. */
  confirm(input: { stationId: string; actorId: string; at: Date; ip: string | null }): Promise<number>;
}

export interface ActivityReadRepo {
  list(filter: { stationId?: string; action?: string; page: number; pageSize: number }): Promise<Page<ActivityDTO>>;
}

// ---------- Event sink (real-time, cache invalidation, notifications plug in here) ----------
export interface FuelStatusChangedEvent {
  stationId: string;
  fuelTypeId: string;
  fuelSlug: string;
  oldStatus: FuelStatus;
  newStatus: FuelStatus;
  actorId: string;
  at: Date;
}

export interface StationStatusChangedEvent {
  stationId: string;
  oldStatus: StationStatus;
  newStatus: StationStatus;
  actorId: string;
  at: Date;
}

export interface AvailabilityConfirmedEvent {
  stationId: string;
  actorId: string;
  at: Date;
}

export interface StatusChangeSink {
  onFuelStatusChanged(e: FuelStatusChangedEvent): Promise<void>;
  onStationStatusChanged(e: StationStatusChangedEvent): Promise<void>;
  onAvailabilityConfirmed(e: AvailabilityConfirmedEvent): Promise<void>;
}

export interface AnalyticsRepo {
  /** Aggregate-only usage events. NEVER pass coordinates or raw user identifiers. */
  record(e: { event: string; stationId?: string | null; fuelSlug?: string | null }): Promise<void>;
}
