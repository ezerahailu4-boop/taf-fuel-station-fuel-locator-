import type { SettingsRepo, StationRepo, FuelTypeRepo, FuelStatusChangedEvent } from "@/types/stations";
import type {
  NotificationRepo,
  SubscriptionRepo,
} from "@/types/notifications";
import { notificationRepository } from "@/repositories/notificationRepository";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";
import { stationRepository } from "@/repositories/stationRepository";
import { fuelTypeRepository } from "@/repositories/fuelTypeRepository";
import { settingsRepository } from "@/repositories/settingsRepository";

export interface NotificationServiceDeps {
  notifications: NotificationRepo;
  subscriptions: SubscriptionRepo;
  stations: StationRepo;
  fuelTypes: FuelTypeRepo;
  settings: SettingsRepo;
}

export function defaultNotificationDeps(): NotificationServiceDeps {
  return {
    notifications: notificationRepository,
    subscriptions: subscriptionRepository,
    stations: stationRepository,
    fuelTypes: fuelTypeRepository,
    settings: settingsRepository,
  };
}

export async function handleFuelStatusChanged(
  e: FuelStatusChangedEvent,
  deps: NotificationServiceDeps = defaultNotificationDeps()
): Promise<{ enqueued: boolean; count: number; reason?: string }> {
  // Only notify when fuel becomes AVAILABLE or LIMITED, and changed from previous
  const isAvailableNow = e.newStatus === "AVAILABLE" || e.newStatus === "LIMITED";
  if (!isAvailableNow || e.oldStatus === e.newStatus) {
    return { enqueued: false, count: 0, reason: "Status did not transition to available/limited" };
  }

  // Check global setting
  const settings = await deps.settings.getMany(["auto_notify_enabled", "auto_notify_cooldown_minutes"]);
  const enabled = settings.auto_notify_enabled !== false;
  if (!enabled) {
    return { enqueued: false, count: 0, reason: "Auto notify disabled in settings" };
  }

  const cooldownMinutes = typeof settings.auto_notify_cooldown_minutes === "number"
    ? settings.auto_notify_cooldown_minutes
    : 60;

  // Check cooldown for this (station, fuel) pair
  const isCoolingDown = await deps.notifications.findRecentAlert(e.stationId, e.fuelTypeId, cooldownMinutes);
  if (isCoolingDown) {
    return { enqueued: false, count: 0, reason: `Alert within cooldown window (${cooldownMinutes}m)` };
  }

  // Get station & fuel details
  const [station, fuelType] = await Promise.all([
    deps.stations.findById(e.stationId),
    deps.fuelTypes.findById(e.fuelTypeId),
  ]);
  if (!station || !fuelType) {
    return { enqueued: false, count: 0, reason: "Station or fuel type not found" };
  }

  // Find subscribers
  const subscribers = await deps.subscriptions.findSubscribersForFuel(e.stationId, e.fuelTypeId);
  if (subscribers.length === 0) {
    return { enqueued: false, count: 0, reason: "No subscribers" };
  }

  const statusEn = e.newStatus === "AVAILABLE" ? "Available" : "Limited";
  const statusAm = e.newStatus === "AVAILABLE" ? "ይገኛል" : "በተወሰነ መጠን ይገኛል";

  const titleEn = `⛽ ${fuelType.nameEn} Available at TAF ${station.branchName}`;
  const titleAm = `⛽ ${fuelType.nameAm} በታፍ ${station.branchName} ይገኛል`;

  const bodyEn = `${fuelType.icon} ${fuelType.nameEn} is now reported as ${statusEn} at TAF ${station.branchName} (${station.address}). Open the app to view details and get directions.`;
  const bodyAm = `${fuelType.icon} ${fuelType.nameAm} አሁን በታፍ ${station.branchName} (${station.address}) ${statusAm} መሆኑ ተዘግቧል። ዝርዝሩን ለማየት እና አቅጣጫ ለመውሰድ መተግበሪያውን ይክፈቱ።`;

  const result = await deps.notifications.enqueue({
    type: "FUEL_AVAILABLE",
    titleEn,
    titleAm,
    bodyEn,
    bodyAm,
    stationId: e.stationId,
    fuelTypeId: e.fuelTypeId,
    createdById: e.actorId,
    recipients: subscribers,
  });

  return { enqueued: true, count: result.deliveryCount };
}

/** Creates a sink that enqueues subscriber notifications upon fuel availability changes. */
export function createNotificationEnqueueSink(deps: NotificationServiceDeps = defaultNotificationDeps()) {
  return {
    async onFuelStatusChanged(e: FuelStatusChangedEvent): Promise<void> {
      try {
        await handleFuelStatusChanged(e, deps);
      } catch (err) {
        console.error("[notification-sink] failed to process fuel status change:", err);
      }
    },
    async onStationStatusChanged(): Promise<void> {},
    async onAvailabilityConfirmed(): Promise<void> {},
  };
}
