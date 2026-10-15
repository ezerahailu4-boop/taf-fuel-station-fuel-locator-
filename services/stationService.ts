import { getDb } from "@/lib/db";
import { badRequest, notFound } from "@/lib/api/errors";
import { requireRole, type Actor } from "@/lib/auth/rbac";
import { buildStationDTO } from "@/lib/fuel/dto";
import type { StationCreateInput, StationListQuery, StationUpdateInput } from "@/lib/validation/station";
import type { ActivityRepo } from "@/types/auth";
import type { FuelTypeRepo, Page, SettingsRepo, StationDTO, StationFuelDTO, StationRepo, StationRow } from "@/types/stations";
import { authorizeStationAccess } from "./accessService";

export interface StationServiceDeps {
  stations: StationRepo;
  fuelTypes: FuelTypeRepo;
  settings: SettingsRepo;
  activity: ActivityRepo;
  users?: {
    findByUsername(username: string): Promise<{ telegramUserId: bigint; firstName: string | null } | null>;
  };
  now?: () => Date;
}

const DEFAULT_STALE_MINUTES = 120;
const clock = (d: StationServiceDeps) => (d.now ?? (() => new Date()))();

export async function getStaleAfterMinutes(settings: SettingsRepo): Promise<number> {
  const { stale_after_minutes } = await settings.getMany(["stale_after_minutes"]);
  return typeof stale_after_minutes === "number" && stale_after_minutes > 0 ? stale_after_minutes : DEFAULT_STALE_MINUTES;
}

async function toDTOs(d: StationServiceDeps, rows: StationRow[]): Promise<StationDTO[]> {
  const [fuelTypes, staleMin] = await Promise.all([d.fuelTypes.list({ includeInactive: false }), getStaleAfterMinutes(d.settings)]);
  const now = clock(d);
  return rows.map((r) => buildStationDTO(r, fuelTypes, now, staleMin));
}

// ---------------- Public (customer) reads: active stations only ----------------

export async function listPublicStations(d: StationServiceDeps, q: StationListQuery): Promise<Page<StationDTO>> {
  const { items, total } = await d.stations.list({ ...q, includeInactive: false });
  return { items: await toDTOs(d, items), total, page: q.page, pageSize: q.pageSize };
}

export async function getPublicStation(d: StationServiceDeps, id: string): Promise<StationDTO> {
  const row = await d.stations.findById(id);
  if (!row || !row.isActive) throw notFound("Station not found");
  return (await toDTOs(d, [row]))[0]!;
}

export async function getPublicAvailability(
  d: StationServiceDeps,
  id: string,
): Promise<{ stationId: string; stationStatus: StationDTO["status"]; lastUpdated: string | null; fuels: StationFuelDTO[] }> {
  const s = await getPublicStation(d, id);
  return { stationId: s.id, stationStatus: s.status, lastUpdated: s.lastUpdated, fuels: s.fuels };
}

// ---------------- Staff reads (includes inactive; branch-scoped) ----------------

export async function getStationForStaff(
  d: StationServiceDeps,
  actor: Actor,
  stationId: string,
  ip: string | null,
): Promise<StationDTO> {
  await authorizeStationAccess(actor, stationId, { write: false, ip }, d.activity);
  const row = await d.stations.findById(stationId);
  if (!row) throw notFound("Station not found");
  return (await toDTOs(d, [row]))[0]!;
}

// ---------------- Super Admin: station management ----------------

function pick<T extends object>(obj: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = (obj as Record<string, unknown>)[k];
  return out;
}

const snapshot = (s: StationRow) => ({
  name: s.name,
  branchName: s.branchName,
  address: s.address,
  city: s.city,
  area: s.area,
  phone: s.phone,
  latitude: s.latitude,
  longitude: s.longitude,
  openingHours: s.openingHours,
  status: s.status,
  services: s.services,
  isActive: s.isActive,
});

export async function createStation(
  d: StationServiceDeps,
  actor: Actor,
  input: StationCreateInput,
  ip: string | null,
): Promise<StationDTO> {
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN");
  const row = await d.stations.create(input);
  await d.activity.log({ actorUserId: actor.id, stationId: row.id, action: "STATION_CREATED", entity: "station", newValue: snapshot(row), ip });
  return (await toDTOs(d, [row]))[0]!;
}

export async function updateStation(
  d: StationServiceDeps,
  actor: Actor,
  id: string,
  patch: StationUpdateInput,
  ip: string | null,
): Promise<StationDTO> {
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN");
  const before = await d.stations.findById(id);
  if (!before) throw notFound("Station not found");

  const oldSnap = snapshot(before) as Record<string, unknown>;
  const changedKeys = Object.keys(patch).filter(
    (k) => JSON.stringify((patch as Record<string, unknown>)[k]) !== JSON.stringify(oldSnap[k]),
  );
  if (changedKeys.length === 0) return (await toDTOs(d, [before]))[0]!;

  const after = await d.stations.update(id, patch);
  if (!after) throw notFound("Station not found");

  await d.activity.log({
    actorUserId: actor.id,
    stationId: id,
    action: "STATION_UPDATED",
    entity: "station",
    oldValue: pick(oldSnap, changedKeys),
    newValue: pick(snapshot(after), changedKeys),
    ip,
  });
  return (await toDTOs(d, [after]))[0]!;
}

export async function deleteStation(d: StationServiceDeps, actor: Actor, id: string, ip: string | null): Promise<void> {
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN");
  const before = await d.stations.findById(id);
  if (!before) throw notFound("Station not found");

  // Log first with a full snapshot: the station_id FK is set to NULL when the station is deleted.
  await d.activity.log({ actorUserId: actor.id, stationId: null, action: "STATION_DELETED", entity: "station", oldValue: { id, ...snapshot(before) }, ip });
  const ok = await d.stations.delete(id);
  if (!ok) throw notFound("Station not found");
}

export async function assignStationAdmin(
  d: StationServiceDeps,
  actor: Actor,
  stationId: string,
  input: { telegramUserId?: string; username?: string; identifier?: string; firstName?: string },
  ip: string | null,
): Promise<{ userId: string; created: boolean }> {
  requireRole(actor, "SUPER_ADMIN");

  const raw = (input.identifier || input.username || input.telegramUserId || "").trim();
  if (!raw) {
    throw badRequest("Telegram username or user ID is required");
  }

  const clean = raw.replace(/^@+/, "").trim();
  const isNumericId = /^\d{1,15}$/.test(clean) && !raw.startsWith("@") && !input.username;

  let targetTgId: bigint;
  let targetFirstName = input.firstName;

  if (isNumericId) {
    targetTgId = BigInt(clean);
  } else {
    let userLookup = d.users ? await d.users.findByUsername(clean) : null;
    if (!userLookup && !d.users) {
      const db = getDb();
      userLookup = await db.user.findFirst({
        where: { username: { equals: clean, mode: "insensitive" } },
        select: { telegramUserId: true, firstName: true },
      });
    }

    if (!userLookup) {
      throw badRequest(`User @${clean} was not found. Please ask them to open the Telegram bot and click Start first, or provide their numeric Telegram ID.`);
    }

    targetTgId = userLookup.telegramUserId;
    if (!targetFirstName && userLookup.firstName) {
      targetFirstName = userLookup.firstName;
    }
  }

  const res = await d.stations.assignAdmin(stationId, targetTgId, targetFirstName ?? "Branch Admin");
  if (res === "station_not_found") throw notFound("Station not found");
  if (res === "is_super_admin") throw badRequest("That account is a Super Admin and cannot be made a branch admin");

  await d.activity.log({
    actorUserId: actor.id,
    stationId,
    action: "BRANCH_ADMIN_ASSIGNED",
    entity: "station_admin",
    newValue: {
      userId: res.userId,
      telegramUserId: targetTgId.toString(),
      username: isNumericId ? undefined : clean,
      createdPlaceholderUser: res.created,
    },
    ip,
  });
  return res;
}

