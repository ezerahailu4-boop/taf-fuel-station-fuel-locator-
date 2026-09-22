import type {
  CreateSubscriptionInput,
  EnqueueNotificationInput,
  InAppNotificationDTO,
  NotificationRepo,
  PendingDeliveryRow,
  SubscriptionDTO,
  SubscriptionRepo,
  DeliveryStatus,
} from "@/types/notifications";

export class FakeSubscriptionRepo implements SubscriptionRepo {
  subscriptions: SubscriptionDTO[] = [];
  subscribers: Array<{
    stationId: string;
    fuelTypeId: string;
    userId: string;
    telegramUserId: bigint;
    preferredLocale: string;
  }> = [];

  async upsert(input: CreateSubscriptionInput): Promise<SubscriptionDTO> {
    const existing = this.subscriptions.find(
      (s) => s.userId === input.userId && s.stationId === input.stationId && s.fuelTypeId === input.fuelTypeId
    );
    if (existing) {
      existing.isActive = true;
      return existing;
    }

    const sub: SubscriptionDTO = {
      id: `sub-${this.subscriptions.length + 1}`,
      userId: input.userId,
      stationId: input.stationId,
      fuelTypeId: input.fuelTypeId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.subscriptions.push(sub);
    return sub;
  }

  async remove(userId: string, idOrPair: string | { stationId: string; fuelTypeId: string }): Promise<boolean> {
    const initialLen = this.subscriptions.length;
    if (typeof idOrPair === "string") {
      this.subscriptions = this.subscriptions.filter((s) => !(s.id === idOrPair && s.userId === userId));
    } else {
      this.subscriptions = this.subscriptions.filter(
        (s) => !(s.userId === userId && s.stationId === idOrPair.stationId && s.fuelTypeId === idOrPair.fuelTypeId)
      );
    }
    return this.subscriptions.length < initialLen;
  }

  async listByUser(userId: string): Promise<SubscriptionDTO[]> {
    return this.subscriptions.filter((s) => s.userId === userId && s.isActive);
  }

  async findSubscribersForFuel(stationId: string, fuelTypeId: string) {
    return this.subscribers
      .filter((s) => s.stationId === stationId && s.fuelTypeId === fuelTypeId)
      .map((s) => ({
        userId: s.userId,
        telegramUserId: s.telegramUserId,
        preferredLocale: s.preferredLocale,
      }));
  }
}

export class FakeNotificationRepo implements NotificationRepo {
  enqueued: EnqueueNotificationInput[] = [];
  deliveries: Array<{
    id: string;
    notificationId: string;
    userId: string;
    status: DeliveryStatus;
    attempts: number;
    error: string | null;
    nextAttemptAt: Date;
    sentAt: Date | null;
    telegramUserId: bigint;
    preferredLocale: string;
    notification: {
      type: EnqueueNotificationInput["type"];
      titleEn: string;
      titleAm: string;
      bodyEn: string;
      bodyAm: string;
      stationId: string | null;
      fuelTypeId: string | null;
    };
  }> = [];
  inApp: InAppNotificationDTO[] = [];
  recentAlerts = new Set<string>();

  async enqueue(input: EnqueueNotificationInput): Promise<{ notificationId: string; deliveryCount: number }> {
    this.enqueued.push(input);
    const notifId = `notif-${this.enqueued.length}`;

    if (input.stationId && input.fuelTypeId) {
      this.recentAlerts.add(`${input.stationId}:${input.fuelTypeId}`);
    }

    for (const r of input.recipients) {
      const dId = `deliv-${this.deliveries.length + 1}`;
      this.deliveries.push({
        id: dId,
        notificationId: notifId,
        userId: r.userId,
        status: "PENDING",
        attempts: 0,
        error: null,
        nextAttemptAt: new Date(),
        sentAt: null,
        telegramUserId: r.telegramUserId ?? 123456789n,
        preferredLocale: r.preferredLocale ?? "en",
        notification: {
          type: input.type,
          titleEn: input.titleEn,
          titleAm: input.titleAm,
          bodyEn: input.bodyEn,
          bodyAm: input.bodyAm,
          stationId: input.stationId ?? null,
          fuelTypeId: input.fuelTypeId ?? null,
        },
      });

      this.inApp.push({
        id: `inapp-${this.inApp.length + 1}`,
        notificationId: notifId,
        type: input.type,
        title: input.titleEn,
        body: input.bodyEn,
        readAt: null,
        createdAt: new Date().toISOString(),
        stationId: input.stationId ?? null,
        fuelTypeId: input.fuelTypeId ?? null,
      });
    }

    return { notificationId: notifId, deliveryCount: input.recipients.length };
  }

  async findRecentAlert(stationId: string, fuelTypeId: string): Promise<boolean> {
    return this.recentAlerts.has(`${stationId}:${fuelTypeId}`);
  }

  async getPendingDeliveries(batchSize: number): Promise<PendingDeliveryRow[]> {
    return this.deliveries
      .filter((d) => d.status === "PENDING" && d.nextAttemptAt <= new Date())
      .slice(0, batchSize)
      .map((d) => ({
        id: d.id,
        notificationId: d.notificationId,
        userId: d.userId,
        attempts: d.attempts,
        telegramUserId: d.telegramUserId,
        preferredLocale: d.preferredLocale,
        notification: d.notification,
      }));
  }

  async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    options?: { error?: string | null; nextAttemptAt?: Date; sentAt?: Date; incrementAttempts?: boolean }
  ): Promise<void> {
    const d = this.deliveries.find((x) => x.id === deliveryId);
    if (!d) return;
    d.status = status;
    if (options?.error !== undefined) d.error = options.error;
    if (options?.nextAttemptAt !== undefined) d.nextAttemptAt = options.nextAttemptAt;
    if (options?.sentAt !== undefined) d.sentAt = options.sentAt;
    if (options?.incrementAttempts) d.attempts += 1;
  }

  async listInAppByUser(userId: string, page = 1, pageSize = 20) {
    const items = this.inApp.slice((page - 1) * pageSize, page * pageSize);
    const unread = this.inApp.filter((i) => !i.readAt).length;
    return { items, total: this.inApp.length, unreadCount: unread };
  }

  async markInAppRead(userId: string, inAppId: string): Promise<boolean> {
    const item = this.inApp.find((i) => i.id === inAppId);
    if (!item) return false;
    item.readAt = new Date().toISOString();
    return true;
  }

  async markAllInAppRead(): Promise<number> {
    let count = 0;
    for (const i of this.inApp) {
      if (!i.readAt) {
        i.readAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  async countUnreadInApp(): Promise<number> {
    return this.inApp.filter((i) => !i.readAt).length;
  }
}
