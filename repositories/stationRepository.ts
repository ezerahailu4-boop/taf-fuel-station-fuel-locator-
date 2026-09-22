import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { StationRepo, StationRow } from "@/types/stations";
import type { StationCreateInput, StationUpdateInput } from "@/lib/validation/station";

const include = {
  fuelStatuses: {
    select: { fuelTypeId: true, status: true, note: true, lastUpdated: true, lastConfirmedAt: true },
  },
} as const;

type DbStation = Prisma.StationGetPayload<{ include: typeof include }>;

function map(s: DbStation): StationRow {
  return {
    id: s.id,
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
    fuelStatuses: s.fuelStatuses,
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;
const isNotFound = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "P2025";

export const stationRepository: StationRepo = {
  async list(f) {
    const and: Prisma.StationWhereInput[] = [];
    if (!f.includeInactive) and.push({ isActive: true });
    if (f.status) and.push({ status: f.status });
    if (f.city) and.push({ city: { equals: f.city, mode: "insensitive" } });
    if (f.area) and.push({ area: { equals: f.area, mode: "insensitive" } });
    if (f.q) {
      const c = { contains: f.q, mode: "insensitive" as const };
      and.push({ OR: [{ name: c }, { branchName: c }, { area: c }, { city: c }, { address: c }] });
    }
    const where: Prisma.StationWhereInput = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      getDb().station.findMany({
        where,
        include,
        orderBy: [{ city: "asc" }, { branchName: "asc" }],
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      getDb().station.count({ where }),
    ]);
    return { items: items.map(map), total };
  },

  async listInBox(box, limit) {
    const rows = await getDb().station.findMany({
      where: {
        isActive: true,
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
      include,
      take: limit,
    });
    return rows.map(map);
  },

  async findById(id) {
    const s = await getDb().station.findUnique({ where: { id }, include });
    return s ? map(s) : null;
  },

  async create(data: StationCreateInput) {
    const s = await getDb().station.create({
      data: { ...data, openingHours: json(data.openingHours) },
      include,
    });
    return map(s);
  },

  async update(id, data: StationUpdateInput) {
    try {
      const { openingHours, ...rest } = data;
      const s = await getDb().station.update({
        where: { id },
        data: { ...rest, ...(openingHours !== undefined ? { openingHours: json(openingHours) } : {}) },
        include,
      });
      return map(s);
    } catch (e) {
      if (isNotFound(e)) return null;
      throw e;
    }
  },

  async delete(id) {
    try {
      await getDb().station.delete({ where: { id } });
      return true;
    } catch (e) {
      if (isNotFound(e)) return false;
      throw e;
    }
  },

  async assignAdmin(stationId, telegramUserId, firstName) {
    return getDb().$transaction(async (tx) => {
      const station = await tx.station.findUnique({ where: { id: stationId }, select: { id: true } });
      if (!station) return "station_not_found" as const;

      const existing = await tx.user.findUnique({ where: { telegramUserId } });
      if (existing?.role === "SUPER_ADMIN") return "is_super_admin" as const;

      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { role: "BRANCH_ADMIN", isActive: true } })
        : await tx.user.create({ data: { telegramUserId, firstName, role: "BRANCH_ADMIN" } });

      // A branch admin belongs to exactly one station: assigning moves them.
      await tx.stationAdmin.upsert({
        where: { userId: user.id },
        update: { stationId },
        create: { userId: user.id, stationId },
      });
      return { userId: user.id, created: !existing };
    });
  },
};
