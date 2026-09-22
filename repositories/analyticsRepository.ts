import { getDb } from "@/lib/db";
import type { AnalyticsRepo } from "@/types/stations";

export const analyticsRepository: AnalyticsRepo = {
  async record({ event, stationId, fuelSlug }) {
    let fuelTypeId: string | null = null;
    if (fuelSlug) {
      const ft = await getDb().fuelType.findUnique({ where: { slug: fuelSlug }, select: { id: true } });
      fuelTypeId = ft?.id ?? null;
    }
    await getDb().analyticsEvent.create({
      data: { event, stationId: stationId ?? null, fuelTypeId },
    });
  },
};
