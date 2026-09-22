import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ActivityRepo } from "@/types/auth";

const asJson = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));

export const activityRepository: ActivityRepo = {
  async log(entry) {
    await getDb().activityLog.create({
      data: {
        actorUserId: entry.actorUserId,
        stationId: entry.stationId,
        action: entry.action,
        entity: entry.entity,
        oldValue: asJson(entry.oldValue),
        newValue: asJson(entry.newValue),
        ip: entry.ip ?? null,
      },
    });
  },
};
