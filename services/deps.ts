import { activityReadRepository } from "@/repositories/activityReadRepository";
import { activityRepository } from "@/repositories/activityRepository";
import { fuelStatusRepository } from "@/repositories/fuelStatusRepository";
import { fuelTypeRepository } from "@/repositories/fuelTypeRepository";
import { settingsRepository } from "@/repositories/settingsRepository";
import { stationRepository } from "@/repositories/stationRepository";
import type { StatusChangeSink } from "@/types/stations";
import { analyticsRepository } from "@/repositories/analyticsRepository";
import type { NearbyDeps } from "./nearbyService";
import { createRealtimeSink } from "./realtime";
import type { ActivityServiceDeps } from "./activityService";
import type { FuelStatusServiceDeps } from "./fuelStatusService";
import type { FuelTypeServiceDeps } from "./fuelTypeService";
import type { StationServiceDeps } from "./stationService";

import { createNotificationEnqueueSink } from "./notificationService";

export function createCompositeSink(...sinks: StatusChangeSink[]): StatusChangeSink {
  return {
    async onFuelStatusChanged(e) {
      await Promise.allSettled(sinks.map((s) => s.onFuelStatusChanged(e)));
    },
    async onStationStatusChanged(e) {
      await Promise.allSettled(sinks.map((s) => s.onStationStatusChanged(e)));
    },
    async onAvailabilityConfirmed(e) {
      await Promise.allSettled(sinks.map((s) => s.onAvailabilityConfirmed(e)));
    },
  };
}

/**
 * Side-effect hooks fired AFTER a status change is committed:
 * 1. Supabase Realtime broadcast (live customer UI updates)
 * 2. Notification queue enqueue (customer alert subscribers)
 */
export const statusChangeSink: StatusChangeSink = createCompositeSink(
  createRealtimeSink({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
  createNotificationEnqueueSink()
);

export const stationDeps = (): StationServiceDeps => ({
  stations: stationRepository,
  fuelTypes: fuelTypeRepository,
  settings: settingsRepository,
  activity: activityRepository,
});

export const fuelStatusDeps = (): FuelStatusServiceDeps => ({
  repo: fuelStatusRepository,
  activity: activityRepository,
  sink: statusChangeSink,
});

export const fuelTypeDeps = (): FuelTypeServiceDeps => ({
  fuelTypes: fuelTypeRepository,
  activity: activityRepository,
});

export const activityDeps = (): ActivityServiceDeps => ({
  read: activityReadRepository,
  activity: activityRepository,
});

export const nearbyDeps = (): NearbyDeps => ({ ...stationDeps(), analytics: analyticsRepository });
