import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/rbac";
import { authorizeStationAccess } from "@/services/accessService";
import { FakeActivityRepo } from "../helpers/fakes";

const boleAdmin: Actor = { id: "bole-admin", role: "BRANCH_ADMIN", stationId: "bole" };

describe("authorizeStationAccess", () => {
  it("allows own-station writes without logging a denial", async () => {
    const log = new FakeActivityRepo();
    await authorizeStationAccess(boleAdmin, "bole", { write: true }, log);
    expect(log.entries).toHaveLength(0);
  });

  it("denies cross-branch writes with 403 AND records an ACCESS_DENIED audit entry", async () => {
    const log = new FakeActivityRepo();
    await expect(authorizeStationAccess(boleAdmin, "saris", { write: true, ip: "1.2.3.4" }, log)).rejects.toMatchObject({
      status: 403,
    });
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({
      actorUserId: "bole-admin",
      stationId: "saris",
      action: "ACCESS_DENIED",
      ip: "1.2.3.4",
    });
  });

  it("still returns 403 even if writing the audit log fails", async () => {
    const failing = { log: async () => Promise.reject(new Error("db down")) };
    const err = await authorizeStationAccess(boleAdmin, "saris", { write: true }, failing).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
  });
});
