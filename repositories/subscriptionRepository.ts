import { getDb } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import type {
  CreateSubscriptionInput,
  SubscriptionDTO,
  SubscriptionRepo,
} from "@/types/notifications";

const stationSelect = {
  id: true,
  name: true,
  branchName: true,
  address: true,
  city: true,
  area: true,
} as const;

const fuelTypeSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAm: true,
  icon: true,
} as const;

function mapSubscription(row: {
  id: string;
  userId: string;
  stationId: string;
  fuelTypeId: string;
  isActive: boolean;
  createdAt: Date;
  station?: typeof stationSelect extends Record<string, boolean> ? any : never;
  fuelType?: typeof fuelTypeSelect extends Record<string, boolean> ? any : never;
}): SubscriptionDTO {
  return {
    id: row.id,
    userId: row.userId,
    stationId: row.stationId,
    fuelTypeId: row.fuelTypeId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    station: row.station
      ? {
          id: row.station.id,
          name: row.station.name,
          branchName: row.station.branchName,
          address: row.station.address,
          city: row.station.city,
          area: row.station.area,
        }
      : undefined,
    fuelType: row.fuelType
      ? {
          id: row.fuelType.id,
          slug: row.fuelType.slug,
          nameEn: row.fuelType.nameEn,
          nameAm: row.fuelType.nameAm,
          icon: row.fuelType.icon,
        }
      : undefined,
  };
}

export const subscriptionRepository: SubscriptionRepo = {
  async upsert(input: CreateSubscriptionInput): Promise<SubscriptionDTO> {
    const db = getDb();

    // Verify station & fuel type exist
    const [station, fuelType] = await Promise.all([
      db.station.findUnique({ where: { id: input.stationId } }),
      db.fuelType.findUnique({ where: { id: input.fuelTypeId } }),
    ]);
    if (!station || !station.isActive) throw notFound("Station not found or inactive");
    if (!fuelType || !fuelType.isActive) throw notFound("Fuel type not found or inactive");

    const row = await db.notificationSubscription.upsert({
      where: {
        userId_stationId_fuelTypeId: {
          userId: input.userId,
          stationId: input.stationId,
          fuelTypeId: input.fuelTypeId,
        },
      },
      create: {
        userId: input.userId,
        stationId: input.stationId,
        fuelTypeId: input.fuelTypeId,
        isActive: true,
      },
      update: {
        isActive: true,
      },
      include: {
        station: { select: stationSelect },
        fuelType: { select: fuelTypeSelect },
      },
    });

    return mapSubscription(row);
  },

  async remove(
    userId: string,
    idOrPair: string | { stationId: string; fuelTypeId: string }
  ): Promise<boolean> {
    const db = getDb();
    if (typeof idOrPair === "string") {
      const res = await db.notificationSubscription.deleteMany({
        where: { id: idOrPair, userId },
      });
      return res.count > 0;
    }

    const res = await db.notificationSubscription.deleteMany({
      where: {
        userId,
        stationId: idOrPair.stationId,
        fuelTypeId: idOrPair.fuelTypeId,
      },
    });
    return res.count > 0;
  },

  async listByUser(userId: string): Promise<SubscriptionDTO[]> {
    const rows = await getDb().notificationSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        station: { select: stationSelect },
        fuelType: { select: fuelTypeSelect },
      },
    });

    return rows.map(mapSubscription);
  },

  async findSubscribersForFuel(
    stationId: string,
    fuelTypeId: string
  ): Promise<Array<{ userId: string; telegramUserId: bigint; preferredLocale: string }>> {
    const rows = await getDb().notificationSubscription.findMany({
      where: {
        stationId,
        fuelTypeId,
        isActive: true,
        user: { isActive: true },
      },
      select: {
        user: {
          select: {
            id: true,
            telegramUserId: true,
            preferredLocale: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      userId: r.user.id,
      telegramUserId: r.user.telegramUserId,
      preferredLocale: r.user.preferredLocale,
    }));
  },
};
