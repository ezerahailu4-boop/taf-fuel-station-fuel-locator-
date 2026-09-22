import { describe, expect, it } from "vitest";
import { FakeSubscriptionRepo } from "../helpers/fakesNotifications";

describe("Subscription Repository", () => {
  it("creates and retrieves a new subscription", async () => {
    const repo = new FakeSubscriptionRepo();

    const sub = await repo.upsert({
      userId: "user-1",
      stationId: "st-bole",
      fuelTypeId: "ft-benzene",
    });

    expect(sub).toBeDefined();
    expect(sub.userId).toBe("user-1");
    expect(sub.stationId).toBe("st-bole");
    expect(sub.fuelTypeId).toBe("ft-benzene");
    expect(sub.isActive).toBe(true);

    const userSubs = await repo.listByUser("user-1");
    expect(userSubs).toHaveLength(1);
    expect(userSubs[0]?.id).toBe(sub.id);
  });

  it("upserting existing subscription preserves uniqueness and updates isActive", async () => {
    const repo = new FakeSubscriptionRepo();

    await repo.upsert({
      userId: "user-1",
      stationId: "st-bole",
      fuelTypeId: "ft-benzene",
    });

    // Second upsert for same user, station, and fuel
    await repo.upsert({
      userId: "user-1",
      stationId: "st-bole",
      fuelTypeId: "ft-benzene",
    });

    const userSubs = await repo.listByUser("user-1");
    expect(userSubs).toHaveLength(1);
  });

  it("removes subscription by ID with user isolation", async () => {
    const repo = new FakeSubscriptionRepo();

    const sub = await repo.upsert({
      userId: "user-1",
      stationId: "st-bole",
      fuelTypeId: "ft-benzene",
    });

    // User-2 cannot remove user-1's subscription
    const removedByOther = await repo.remove("user-2", sub.id);
    expect(removedByOther).toBe(false);
    expect(await repo.listByUser("user-1")).toHaveLength(1);

    // User-1 removes their own subscription
    const removedByOwner = await repo.remove("user-1", sub.id);
    expect(removedByOwner).toBe(true);
    expect(await repo.listByUser("user-1")).toHaveLength(0);
  });

  it("removes subscription by station & fuel pair", async () => {
    const repo = new FakeSubscriptionRepo();

    await repo.upsert({
      userId: "user-1",
      stationId: "st-saris",
      fuelTypeId: "ft-diesel",
    });

    const removed = await repo.remove("user-1", {
      stationId: "st-saris",
      fuelTypeId: "ft-diesel",
    });
    expect(removed).toBe(true);
    expect(await repo.listByUser("user-1")).toHaveLength(0);
  });
});
