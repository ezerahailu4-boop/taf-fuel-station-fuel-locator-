import { describe, expect, it } from "vitest";
import {
  handleFuelStatusChanged,
  createNotificationEnqueueSink,
  type NotificationServiceDeps,
} from "@/services/notificationService";
import { FakeSettingsRepo, FakeFuelTypeRepo, FakeStationRepo, makeStation, FUEL_BENZINE, FUEL_DIESEL } from "../helpers/fakes2";
import { FakeNotificationRepo, FakeSubscriptionRepo } from "../helpers/fakesNotifications";

const BOLE = "st-bole";
const ACTOR = "admin-1";
const NOW = new Date("2026-09-22T10:00:00Z");

function setup(opts?: { autoNotify?: boolean; cooldown?: number }) {
  const stations = new FakeStationRepo([makeStation({ id: BOLE, branchName: "Bole" })]);
  const fuelTypes = new FakeFuelTypeRepo([FUEL_BENZINE, FUEL_DIESEL]);
  const notifications = new FakeNotificationRepo();
  const subscriptions = new FakeSubscriptionRepo();
  const settings = new FakeSettingsRepo({
    auto_notify_enabled: opts?.autoNotify ?? true,
    auto_notify_cooldown_minutes: opts?.cooldown ?? 60,
  });

  // Add subscribers
  subscriptions.subscribers.push(
    {
      stationId: BOLE,
      fuelTypeId: FUEL_BENZINE.id,
      userId: "user-1",
      telegramUserId: 111111n,
      preferredLocale: "en",
    },
    {
      stationId: BOLE,
      fuelTypeId: FUEL_BENZINE.id,
      userId: "user-2",
      telegramUserId: 222222n,
      preferredLocale: "am",
    }
  );

  const deps: NotificationServiceDeps = {
    notifications,
    subscriptions,
    stations,
    fuelTypes,
    settings,
  };

  return { deps, notifications, subscriptions, stations, fuelTypes };
}

describe("Notification Service", () => {
  it("enqueues notification when fuel transitions from OUT_OF_STOCK to AVAILABLE", async () => {
    const { deps, notifications } = setup();

    const res = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "OUT_OF_STOCK",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );

    expect(res.enqueued).toBe(true);
    expect(res.count).toBe(2);
    expect(notifications.enqueued).toHaveLength(1);

    const notif = notifications.enqueued[0]!;
    expect(notif.type).toBe("FUEL_AVAILABLE");
    expect(notif.titleEn).toContain(`${FUEL_BENZINE.nameEn} Available at TAF Bole`);
    expect(notif.titleAm).toContain("ቤንዚን በታፍ Bole ይገኛል");
    expect(notif.bodyEn).toContain("reported as Available");
    expect(notif.bodyAm).toContain("ይገኛል መሆኑ ተዘግቧል");
    expect(notif.recipients).toHaveLength(2);
  });

  it("enqueues notification when fuel transitions from UNKNOWN to LIMITED", async () => {
    const { deps, notifications } = setup();

    const res = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "UNKNOWN",
        newStatus: "LIMITED",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );

    expect(res.enqueued).toBe(true);
    expect(res.count).toBe(2);
    expect(notifications.enqueued[0]?.bodyEn).toContain("reported as Limited");
  });

  it("skips notification when fuel transitions to OUT_OF_STOCK", async () => {
    const { deps, notifications } = setup();

    const res = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "AVAILABLE",
        newStatus: "OUT_OF_STOCK",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );

    expect(res.enqueued).toBe(false);
    expect(notifications.enqueued).toHaveLength(0);
  });

  it("skips notification when status has not changed (no-op guard)", async () => {
    const { deps, notifications } = setup();

    const res = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "AVAILABLE",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );

    expect(res.enqueued).toBe(false);
    expect(notifications.enqueued).toHaveLength(0);
  });

  it("respects cooldown window: duplicate alerts within cooldown window are rejected", async () => {
    const { deps, notifications } = setup({ cooldown: 60 });

    // First transition succeeds
    const res1 = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "OUT_OF_STOCK",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );
    expect(res1.enqueued).toBe(true);

    // Second transition within cooldown window is skipped
    const res2 = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "LIMITED",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: new Date(NOW.getTime() + 10 * 60 * 1000), // 10 mins later
      },
      deps
    );
    expect(res2.enqueued).toBe(false);
    expect(res2.reason).toContain("cooldown window");
    expect(notifications.enqueued).toHaveLength(1);
  });

  it("respects auto_notify_enabled setting", async () => {
    const { deps, notifications } = setup({ autoNotify: false });

    const res = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "OUT_OF_STOCK",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );

    expect(res.enqueued).toBe(false);
    expect(res.reason).toContain("disabled");
    expect(notifications.enqueued).toHaveLength(0);
  });

  it("handles case where station has no subscribers gracefully", async () => {
    const { deps, notifications } = setup();

    const res = await handleFuelStatusChanged(
      {
        stationId: BOLE,
        fuelTypeId: FUEL_DIESEL.id, // No subscribers for diesel
        fuelSlug: "diesel",
        oldStatus: "OUT_OF_STOCK",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: NOW,
      },
      deps
    );

    expect(res.enqueued).toBe(false);
    expect(res.reason).toBe("No subscribers");
    expect(notifications.enqueued).toHaveLength(0);
  });

  it("createNotificationEnqueueSink handles errors without bubbling", async () => {
    const { deps } = setup();
    const sink = createNotificationEnqueueSink(deps);

    // Should not throw even with an invalid station
    await expect(
      sink.onFuelStatusChanged({
        stationId: "non-existent",
        fuelTypeId: FUEL_BENZINE.id,
        fuelSlug: "benzene",
        oldStatus: "OUT_OF_STOCK",
        newStatus: "AVAILABLE",
        actorId: ACTOR,
        at: NOW,
      })
    ).resolves.toBeUndefined();
  });
});
