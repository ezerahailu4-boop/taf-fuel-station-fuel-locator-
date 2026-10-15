import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/broadcast/route";
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

const { mockUsers, mockBroadcasts } = vi.hoisted(() => {
  return {
    mockUsers: [
      { id: "u-1", telegramUserId: 1001n, preferredLocale: "en", firstName: "Alice" },
      { id: "u-2", telegramUserId: 1002n, preferredLocale: "am", firstName: "Bob" },
      { id: "u-3", telegramUserId: null, preferredLocale: "en", firstName: "Charlie" },
    ],
    mockBroadcasts: [
      {
        id: "b-1",
        type: "ANNOUNCEMENT",
        titleEn: "Fuel Restocked",
        titleAm: "ነዳጅ ገብቷል",
        bodyEn: "Benzine is available now",
        bodyAm: "ቤንዚን አሁን ይገኛል",
        createdAt: new Date("2026-10-15T10:00:00Z"),
        station: { id: "s-1", name: "TAF Bole", branchName: "Bole", city: "Addis Ababa" },
        createdBy: { id: "admin-1", firstName: "Super", lastName: "Admin", username: "superadmin", role: "SUPER_ADMIN" },
        _count: { inApp: 3, deliveries: 2 },
        deliveries: [{ status: "SENT" }, { status: "SENT" }],
        audience: { target: "ALL" },
      },
    ],
  };
});

vi.mock("@/lib/db", () => {
  const db = {
    user: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where?.id === "super-1") {
          return Promise.resolve({
            id: "super-1",
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
        if (where?.id === "customer-1") {
          return Promise.resolve({
            id: "customer-1",
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
      count: vi.fn().mockImplementation(({ where }) => {
        if (where?.telegramUserId) return Promise.resolve(2);
        if (where?.role === "CUSTOMER") return Promise.resolve(2);
        if (where?.role?.in) return Promise.resolve(1);
        return Promise.resolve(3);
      }),
      findMany: vi.fn().mockResolvedValue(mockUsers),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue(mockBroadcasts),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "notif-new-123", ...data })
      ),
    },
    inAppNotification: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    notificationDelivery: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    activityLog: {
      create: vi.fn().mockResolvedValue({ id: "act-1" }),
    },
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return await callback(db);
    }),
  };
  return { getDb: () => db };
});

vi.mock("@/lib/telegram/bot", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue({ ok: true, messageId: 999 }),
}));

describe("Super Admin Broadcast Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = SECRET;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  async function makeAuthHeader(userId: string = "super-1") {
    const token = await signSession(userId, SECRET, 3600);
    return `Bearer ${token}`;
  }

  it("GET /api/admin/broadcast returns audience statistics and past broadcasts", async () => {
    const auth = await makeAuthHeader("super-1");
    const req = new NextRequest("http://localhost:3000/api/admin/broadcast", {
      headers: { authorization: auth },
    });

    const res = await GET(req, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.audience).toBeDefined();
    expect(json.audience.totalUsers).toBe(3);
    expect(json.audience.telegramUsers).toBe(2);
    expect(json.broadcasts).toHaveLength(1);
    expect(json.broadcasts[0].titleEn).toBe("Fuel Restocked");
    expect(json.broadcasts[0].telegramSent).toBe(2);
  });

  it("POST /api/admin/broadcast dispatches an announcement to targeted users", async () => {
    const auth = await makeAuthHeader("super-1");
    const payload = {
      titleEn: "Urgent Maintenance Notice",
      titleAm: "አስቸኳይ የጥገና ማስታወቂያ",
      bodyEn: "All pumps will pause for 15 minutes.",
      bodyAm: "ሁሉም ፓምፖች ለ15 ደቂቃ ይቆማሉ።",
      targetAudience: "ALL",
      sendTelegram: true,
      sendInApp: true,
    };

    const req = new NextRequest("http://localhost:3000/api/admin/broadcast", {
      method: "POST",
      headers: {
        authorization: auth,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req, {} as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.notificationId).toBeDefined();
    expect(json.recipientCount).toBe(3);
    expect(json.telegramCount).toBe(2); // Only u-1 and u-2 have telegramUserId
  });

  it("rejects unauthorized access for standard customers", async () => {
    const auth = await makeAuthHeader("customer-1");
    const req = new NextRequest("http://localhost:3000/api/admin/broadcast", {
      headers: { authorization: auth },
    });

    const res = await GET(req, {} as any);
    expect(res.status).toBe(403);
  });

  it("validates missing title and body on POST", async () => {
    const auth = await makeAuthHeader("super-1");
    const req = new NextRequest("http://localhost:3000/api/admin/broadcast", {
      method: "POST",
      headers: {
        authorization: auth,
        "content-type": "application/json",
      },
      body: JSON.stringify({ titleEn: "", bodyEn: "" }),
    });

    const res = await POST(req, {} as any);
    expect(res.status).toBe(400);
  });
});
