import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getSettings, PUT as putSettings } from "@/app/api/admin/settings/route";
import { GET as getOverview } from "@/app/api/admin/overview/route";
import { GET as getAnalytics } from "@/app/api/admin/analytics/route";
import { NextRequest } from "next/server";
import { signSession } from "@/lib/auth/session";

const SECRET = "secret-for-testing-at-least-32-chars-long";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    TELEGRAM_BOT_TOKEN: "1234567890:mock-token-here",
    TELEGRAM_WEBHOOK_SECRET: "mock_webhook_secret_key_123456",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    SESSION_SECRET: SECRET,
    INIT_DATA_MAX_AGE_SECONDS: 86400,
    SESSION_TTL_SECONDS: 43200,
  }),
}));

// Mock database calls
vi.mock("@/lib/db", () => {
  const db = {
    station: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "st-tolroad",
          name: "Tolroad TAF Station",
          branchName: "Tolroad",
          city: "Adama",
          area: "Adama-Finfinee Expressway",
          address: "Adama-Finfinee Rest Stop",
          phone: "+251911000000",
          latitude: 8.751643,
          longitude: 39.0160711,
          status: "OPEN",
          isActive: true,
          admins: [
            {
              user: {
                id: "u-admin",
                firstName: "TAF",
                lastName: "Admin",
                telegramUserId: 2074368152n,
              },
            },
          ],
          fuelStatuses: [
            {
              status: "AVAILABLE",
              fuelType: { slug: "benzine", nameEn: "Benzine", icon: "⛽" },
            },
          ],
        },
      ]),
    },
    fuelType: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([
        { id: "ft-1", slug: "benzine", nameEn: "Benzine", icon: "⛽" },
      ]),
    },
    user: {
      count: vi.fn().mockResolvedValue(100),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id?: string; telegramUserId?: bigint } }) => {
        if (where.id === "u-super") {
          return Promise.resolve({
            id: "u-super",
            telegramUserId: 111111n,
            firstName: "Super",
            lastName: null,
            username: "superadmin",
            preferredLocale: "en",
            role: "SUPER_ADMIN",
            isActive: true,
            stationAdmin: null,
          });
        }
        if (where.id === "u-customer") {
          return Promise.resolve({
            id: "u-customer",
            telegramUserId: 222222n,
            firstName: "Customer",
            lastName: null,
            username: "customer",
            preferredLocale: "en",
            role: "CUSTOMER",
            isActive: true,
            stationAdmin: null,
          });
        }
        return Promise.resolve(null);
      }),
    },
    notificationSubscription: {
      count: vi.fn().mockResolvedValue(42),
    },
    notificationDelivery: {
      count: vi.fn().mockResolvedValue(85),
    },
    activityLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "act-1",
          action: "FUEL_STATUS_CHANGED",
          entity: "fuel_status",
          createdAt: new Date(),
          actor: { firstName: "TAF", lastName: "Admin", role: "SUPER_ADMIN" },
          station: { branchName: "Tolroad" },
          newValue: { status: "AVAILABLE" },
          oldValue: { status: "OUT_OF_STOCK" },
        },
      ]),
      create: vi.fn().mockResolvedValue({ id: "act-new" }),
    },
    setting: {
      findMany: vi.fn().mockResolvedValue([
        { key: "company_name", value: "TAF Fuel Station" },
        { key: "default_radius_km", value: 25 },
        { key: "stale_after_minutes", value: 120 },
      ]),
      upsert: vi.fn().mockResolvedValue({ key: "k", value: "v" }),
    },
    analyticsEvent: {
      count: vi.fn().mockResolvedValue(500),
      groupBy: vi.fn().mockResolvedValue([
        { event: "station_view", _count: { event: 300 } },
        { event: "nearby_search", _count: { event: 200 } },
      ]),
    },
    $transaction: vi.fn().mockImplementation((ops) => Promise.all(ops)),
  };
  return { getDb: () => db };
});

describe("Super Admin Endpoints", () => {
  let superToken: string;
  let customerToken: string;

  beforeEach(async () => {
    process.env.SESSION_SECRET = SECRET;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    superToken = await signSession("u-super", SECRET, 3600);
    customerToken = await signSession("u-customer", SECRET, 3600);
  });

  describe("GET & PUT /api/admin/settings", () => {
    it("allows SUPER_ADMIN to retrieve system settings", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        headers: { authorization: `Bearer ${superToken}` },
      });
      const res = await getSettings(req, {} as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings).toBeDefined();
      expect(data.settings.company_name).toBe("TAF Fuel Station");
    });

    it("denies CUSTOMER from retrieving settings with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        headers: { authorization: `Bearer ${customerToken}` },
      });
      const res = await getSettings(req, {} as any);
      expect(res.status).toBe(403);
    });

    it("allows SUPER_ADMIN to update settings", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "PUT",
        headers: {
          authorization: `Bearer ${superToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ default_radius_km: 30 }),
      });
      const res = await putSettings(req, {} as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("GET /api/admin/overview", () => {
    it("returns KPI statistics and station list for SUPER_ADMIN", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: { authorization: `Bearer ${superToken}` },
      });
      const res = await getOverview(req, {} as any);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.stats.stations.total).toBe(5);
      expect(data.stats.subscribers.activeSubscriptions).toBe(42);
      expect(data.stations).toHaveLength(1);
      expect(data.stations[0].branchName).toBe("Tolroad");
      expect(data.stations[0].admin.telegramUserId).toBe("2074368152");
    });

    it("denies CUSTOMER access to overview with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: { authorization: `Bearer ${customerToken}` },
      });
      const res = await getOverview(req, {} as any);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/admin/analytics", () => {
    it("returns aggregated privacy-safe analytics", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/analytics", {
        headers: { authorization: `Bearer ${superToken}` },
      });
      const res = await getAnalytics(req, {} as any);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.summary.total).toBe(500);
      expect(data.byType.station_view).toBe(300);
      expect(data.byType.nearby_search).toBe(200);
    });
  });
});
