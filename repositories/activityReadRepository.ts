import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ActivityReadRepo } from "@/types/stations";

export const activityReadRepository: ActivityReadRepo = {
  async list({ stationId, action, page, pageSize }) {
    const where: Prisma.ActivityLogWhereInput = {
      ...(stationId ? { stationId } : {}),
      ...(action ? { action } : {}),
    };
    const [rows, total] = await Promise.all([
      getDb().activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true } },
          station: { select: { id: true, branchName: true } },
        },
      }),
      getDb().activityLog.count({ where }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: r.action,
        entity: r.entity,
        oldValue: r.oldValue,
        newValue: r.newValue,
        actor: r.actor,
        station: r.station,
      })),
    };
  },
};
