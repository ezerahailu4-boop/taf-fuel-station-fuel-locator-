import { getDb } from "@/lib/db";
import type {
  DeliveryStatus,
  EnqueueNotificationInput,
  InAppNotificationDTO,
  NotificationRepo,
  PendingDeliveryRow,
} from "@/types/notifications";

export const notificationRepository: NotificationRepo = {
  async enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: string; deliveryCount: number }> {
    const db = getDb();
    if (input.recipients.length === 0) {
      // Still create the notification record for auditing
      const notif = await db.notification.create({
        data: {
          type: input.type,
          titleEn: input.titleEn,
          titleAm: input.titleAm,
          bodyEn: input.bodyEn,
          bodyAm: input.bodyAm,
          stationId: input.stationId,
          fuelTypeId: input.fuelTypeId,
          createdById: input.createdById,
        },
      });
      return { notificationId: notif.id, deliveryCount: 0 };
    }

    return await db.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: {
          type: input.type,
          titleEn: input.titleEn,
          titleAm: input.titleAm,
          bodyEn: input.bodyEn,
          bodyAm: input.bodyAm,
          stationId: input.stationId,
          fuelTypeId: input.fuelTypeId,
          createdById: input.createdById,
        },
      });

      // Filter out duplicate user IDs in the batch
      const uniqueUserIds = Array.from(new Set(input.recipients.map((r) => r.userId)));

      // Bulk create deliveries and in-app records
      await tx.notificationDelivery.createMany({
        data: uniqueUserIds.map((userId) => ({
          notificationId: notif.id,
          userId,
          status: "PENDING" as DeliveryStatus,
          attempts: 0,
          nextAttemptAt: new Date(),
        })),
        skipDuplicates: true,
      });

      await tx.inAppNotification.createMany({
        data: uniqueUserIds.map((userId) => ({
          notificationId: notif.id,
          userId,
        })),
        skipDuplicates: true,
      });

      return { notificationId: notif.id, deliveryCount: uniqueUserIds.length };
    });
  },

  async findRecentAlert(stationId: string, fuelTypeId: string, windowMinutes: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    const count = await getDb().notification.count({
      where: {
        stationId,
        fuelTypeId,
        createdAt: { gte: cutoff },
        type: { in: ["FUEL_AVAILABLE", "FUEL_UNAVAILABLE"] },
      },
    });
    return count > 0;
  },

  async getPendingDeliveries(batchSize: number): Promise<PendingDeliveryRow[]> {
    const rows = await getDb().notificationDelivery.findMany({
      where: {
        status: "PENDING",
        nextAttemptAt: { lte: new Date() },
      },
      take: batchSize,
      orderBy: { nextAttemptAt: "asc" },
      include: {
        user: {
          select: {
            telegramUserId: true,
            preferredLocale: true,
          },
        },
        notification: {
          select: {
            type: true,
            titleEn: true,
            titleAm: true,
            bodyEn: true,
            bodyAm: true,
            stationId: true,
            fuelTypeId: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      notificationId: r.notificationId,
      userId: r.userId,
      attempts: r.attempts,
      telegramUserId: r.user.telegramUserId,
      preferredLocale: r.user.preferredLocale,
      notification: {
        type: r.notification.type,
        titleEn: r.notification.titleEn,
        titleAm: r.notification.titleAm,
        bodyEn: r.notification.bodyEn,
        bodyAm: r.notification.bodyAm,
        stationId: r.notification.stationId,
        fuelTypeId: r.notification.fuelTypeId,
      },
    }));
  },

  async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    options?: { error?: string | null; nextAttemptAt?: Date; sentAt?: Date; incrementAttempts?: boolean }
  ): Promise<void> {
    await getDb().notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        error: options?.error,
        nextAttemptAt: options?.nextAttemptAt,
        sentAt: options?.sentAt,
        ...(options?.incrementAttempts ? { attempts: { increment: 1 } } : {}),
      },
    });
  },

  async listInAppByUser(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ items: InAppNotificationDTO[]; total: number; unreadCount: number }> {
    const db = getDb();
    const skip = (page - 1) * pageSize;

    const [rows, total, unreadCount] = await Promise.all([
      db.inAppNotification.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          notification: {
            include: {
              station: { select: { branchName: true } },
            },
          },
        },
      }),
      db.inAppNotification.count({ where: { userId } }),
      db.inAppNotification.count({ where: { userId, readAt: null } }),
    ]);

    const items: InAppNotificationDTO[] = rows.map((r) => ({
      id: r.id,
      notificationId: r.notificationId,
      type: r.notification.type,
      title: r.notification.titleEn, // client can choose localized display
      body: r.notification.bodyEn,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      stationId: r.notification.stationId,
      fuelTypeId: r.notification.fuelTypeId,
      stationBranchName: r.notification.station?.branchName ?? null,
    }));

    return { items, total, unreadCount };
  },

  async markInAppRead(userId: string, inAppId: string): Promise<boolean> {
    const res = await getDb().inAppNotification.updateMany({
      where: { id: inAppId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count > 0;
  },

  async markAllInAppRead(userId: string): Promise<number> {
    const res = await getDb().inAppNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  },

  async countUnreadInApp(userId: string): Promise<number> {
    return getDb().inAppNotification.count({
      where: { userId, readAt: null },
    });
  },
};
