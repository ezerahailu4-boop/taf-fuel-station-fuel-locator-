import { notFound } from "@/lib/api/errors";
import { planUpdate, type UpdatePlan } from "@/lib/fuel/plan";
import type {
  ActivityReadRepo,
  ApplyUpdateInput,
  FuelStatusChangedEvent,
  FuelStatusRepo,
  FuelStatusRow,
  FuelTypeRepo,
  FuelTypeRow,
  SettingsRepo,
  StationRepo,
  StationRow,
  StatusChangeSink,
  StationStatusChangedEvent,
  AvailabilityConfirmedEvent,
} from "@/types/stations";
import type { StationCreateInput, StationUpdateInput } from "@/lib/validation/station";

export const FUEL_BENZINE: FuelTypeRow = { id: "f-benz", slug: "benzine", nameEn: "Benzine", nameAm: "ቤንዚን", icon: "⛽", isActive: true, displayOrder: 1 };
export const FUEL_DIESEL: FuelTypeRow = { id: "f-dsl", slug: "diesel", nameEn: "Diesel", nameAm: "ናፍጣ", icon: "⛽", isActive: true, displayOrder: 2 };
export const FUEL_OFF: FuelTypeRow = { id: "f-off", slug: "old-fuel", nameEn: "Old", nameAm: "Old", icon: "⛽", isActive: false, displayOrder: 9 };

export function makeStation(over: Partial<StationRow> = {}): StationRow {
  return {
    id: "st-bole",
    name: "TAF Fuel Station",
    branchName: "Bole",
    address: "Bole, Addis Ababa",
    city: "Addis Ababa",
    area: "Bole",
    phone: null,
    latitude: 9,
    longitude: 38.7,
    openingHours: { is24h: true },
    status: "OPEN",
    services: [],
    isActive: true,
    fuelStatuses: [],
    ...over,
  };
}

export class FakeStationRepo implements StationRepo {
  rows = new Map<string, StationRow>();
  assignResult: Awaited<ReturnType<StationRepo["assignAdmin"]>> | undefined;
  constructor(initial: StationRow[] = []) {
    for (const s of initial) this.rows.set(s.id, s);
  }
  async list(f: Parameters<StationRepo["list"]>[0]) {
    let items = [...this.rows.values()].filter((s) => f.includeInactive || s.isActive);
    if (f.q) items = items.filter((s) => s.branchName.toLowerCase().includes(f.q!.toLowerCase()));
    return { items, total: items.length };
  }
  async listInBox(box: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
    return [...this.rows.values()].filter(
      (s) => s.isActive && s.latitude >= box.minLat && s.latitude <= box.maxLat && s.longitude >= box.minLng && s.longitude <= box.maxLng,
    );
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async create(data: StationCreateInput) {
    const row = makeStation({ id: `st-${this.rows.size + 1}`, ...data, area: data.area ?? null, phone: data.phone ?? null });
    this.rows.set(row.id, row);
    return row;
  }
  async update(id: string, data: StationUpdateInput) {
    const cur = this.rows.get(id);
    if (!cur) return null;
    const next = { ...cur, ...data } as StationRow;
    this.rows.set(id, next);
    return next;
  }
  async delete(id: string) {
    return this.rows.delete(id);
  }
  async assignAdmin() {
    return this.assignResult ?? { userId: "new-user", created: true };
  }
}

export class FakeFuelTypeRepo implements FuelTypeRepo {
  rows: FuelTypeRow[];
  constructor(rows: FuelTypeRow[] = [FUEL_BENZINE, FUEL_DIESEL]) {
    this.rows = rows;
  }
  async list({ includeInactive }: { includeInactive: boolean }) {
    return this.rows.filter((f) => includeInactive || f.isActive);
  }
  async findById(id: string) {
    return this.rows.find((f) => f.id === id) ?? null;
  }
  async create(data: Omit<FuelTypeRow, "id">) {
    const row = { id: `f-${this.rows.length + 1}`, ...data };
    this.rows.push(row);
    return row;
  }
  async update(id: string, data: Partial<Omit<FuelTypeRow, "id">>) {
    const i = this.rows.findIndex((f) => f.id === id);
    if (i === -1) return null;
    this.rows[i] = { ...this.rows[i]!, ...data };
    return this.rows[i]!;
  }
}

export class FakeSettingsRepo implements SettingsRepo {
  constructor(private values: Record<string, unknown> = {}) {}
  async getMany(keys: string[]) {
    return Object.fromEntries(keys.filter((k) => k in this.values).map((k) => [k, this.values[k]]));
  }
}

/** In-memory twin of the Prisma transaction: uses the SAME planUpdate() so behavior matches production. */
export class FakeFuelStatusRepo implements FuelStatusRepo {
  statuses = new Map<string, FuelStatusRow>(); // key: stationId|fuelTypeId
  history: Array<{ stationId: string; fuelTypeId: string; oldStatus: string; newStatus: string; changedBy: string }> = [];
  applyCalls = 0;
  confirmCount = 2;
  constructor(
    private stations: FakeStationRepo,
    private fuelTypes: FakeFuelTypeRepo,
  ) {}
  async applyUpdate(input: ApplyUpdateInput): Promise<UpdatePlan> {
    this.applyCalls++;
    const station = this.stations.rows.get(input.stationId);
    if (!station) throw notFound("Station not found");
    const ftRows = await this.fuelTypes.list({ includeInactive: true });
    const plan = planUpdate({
      station,
      fuelTypes: new Map(ftRows.map((f) => [f.id, { slug: f.slug, isActive: f.isActive }])),
      current: new Map(
        [...this.statuses.entries()]
          .filter(([k]) => k.startsWith(`${input.stationId}|`))
          .map(([k, v]) => [k.split("|")[1]!, { status: v.status, note: v.note }]),
      ),
      desired: { stationStatus: input.stationStatus, fuels: input.fuels },
    });
    for (const c of plan.fuelChanges) {
      this.statuses.set(`${input.stationId}|${c.fuelTypeId}`, {
        fuelTypeId: c.fuelTypeId,
        status: c.newStatus,
        note: c.newNote,
        lastUpdated: input.at,
        lastConfirmedAt: input.at,
      });
      if (c.statusChanged)
        this.history.push({ stationId: input.stationId, fuelTypeId: c.fuelTypeId, oldStatus: c.oldStatus, newStatus: c.newStatus, changedBy: input.actorId });
    }
    if (plan.stationStatusChange) station.status = plan.stationStatusChange.new;
    return plan;
  }
  async confirm() {
    return this.confirmCount;
  }
}

export class RecordingSink implements StatusChangeSink {
  fuel: FuelStatusChangedEvent[] = [];
  station: StationStatusChangedEvent[] = [];
  confirmed: AvailabilityConfirmedEvent[] = [];
  failWith: Error | null = null;
  async onFuelStatusChanged(e: FuelStatusChangedEvent) {
    if (this.failWith) throw this.failWith;
    this.fuel.push(e);
  }
  async onStationStatusChanged(e: StationStatusChangedEvent) {
    if (this.failWith) throw this.failWith;
    this.station.push(e);
  }
  async onAvailabilityConfirmed(e: AvailabilityConfirmedEvent) {
    if (this.failWith) throw this.failWith;
    this.confirmed.push(e);
  }
}

export class FakeActivityReadRepo implements ActivityReadRepo {
  lastFilter: unknown;
  async list(filter: { stationId?: string; action?: string; page: number; pageSize: number }) {
    this.lastFilter = filter;
    return { items: [], total: 0, page: filter.page, pageSize: filter.pageSize };
  }
}
