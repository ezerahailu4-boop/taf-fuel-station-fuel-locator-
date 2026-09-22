import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/cron/notifications/route";
import { notificationRepository } from "@/repositories/notificationRepository";
import { NextRequest } from "next/server";

// Mock notificationRepository
vi.mock("@/repositories/notificationRepository", () => ({
  notificationRepository: {
    getPendingDeliveries: vi.fn(),
    updateDeliveryStatus: vi.fn(),
  },
}));

// Mock fetch for Telegram Bot API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Cron Notifications Outbox Worker", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "123456:BOT-TOKEN";
    process.env.NEXT_PUBLIC_APP_URL = "https://taf.example.com";
    delete process.env.CRON_SECRET;
  });

  it("returns processed: 0 when outbox is empty", async () => {
    vi.mocked(notificationRepository.getPendingDeliveries).mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/cron/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends message and updates status to SENT on success", async () => {
    vi.mocked(notificationRepository.getPendingDeliveries).mockResolvedValue([
      {
        id: "deliv-1",
        notificationId: "notif-1",
        userId: "user-1",
        attempts: 0,
        telegramUserId: 987654321n,
        preferredLocale: "en",
        notification: {
          type: "FUEL_AVAILABLE",
          titleEn: "⛽ Benzene Available",
          titleAm: "⛽ ቤንዚን ይገኛል",
          bodyEn: "Benzene is now available at TAF Bole",
          bodyAm: "ቤንዚን በታፍ ቦሌ ይገኛል",
          stationId: "st-bole",
          fuelTypeId: "ft-benzene",
        },
      },
    ]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 101 } }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const req = new NextRequest("http://localhost:3000/api/cron/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);

    // Verify Telegram call
    expect(mockFetch).toHaveBeenCalled();
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("sendMessage");
    const payload = JSON.parse(init.body);
    expect(payload.chat_id).toBe(987654321);
    expect(payload.text).toContain("Benzene Available");

    // Verify repository was called to mark SENT
    expect(notificationRepository.updateDeliveryStatus).toHaveBeenCalledWith(
      "deliv-1",
      "SENT",
      expect.objectContaining({ incrementAttempts: true })
    );
  });

  it("marks delivery as BLOCKED when user has blocked the bot (403)", async () => {
    vi.mocked(notificationRepository.getPendingDeliveries).mockResolvedValue([
      {
        id: "deliv-blocked",
        notificationId: "notif-2",
        userId: "user-2",
        attempts: 0,
        telegramUserId: 555555n,
        preferredLocale: "en",
        notification: {
          type: "FUEL_AVAILABLE",
          titleEn: "Alert",
          titleAm: "ማስጠንቀቂያ",
          bodyEn: "Fuel available",
          bodyAm: "ነዳጅ ይገኛል",
          stationId: "st-bole",
          fuelTypeId: "ft-benzene",
        },
      },
    ]);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ ok: false, description: "Forbidden: bot was blocked by the user" }),
    });

    const req = new NextRequest("http://localhost:3000/api/cron/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.blocked).toBe(1);

    expect(notificationRepository.updateDeliveryStatus).toHaveBeenCalledWith(
      "deliv-blocked",
      "BLOCKED",
      expect.objectContaining({ error: expect.stringContaining("blocked") })
    );
  });

  it("schedules exponential retry when transient network or 500 error occurs", async () => {
    vi.mocked(notificationRepository.getPendingDeliveries).mockResolvedValue([
      {
        id: "deliv-transient",
        notificationId: "notif-3",
        userId: "user-3",
        attempts: 1, // Already tried once
        telegramUserId: 777777n,
        preferredLocale: "en",
        notification: {
          type: "FUEL_AVAILABLE",
          titleEn: "Alert",
          titleAm: "ማስጠንቀቂያ",
          bodyEn: "Fuel available",
          bodyAm: "ነዳጅ ይገኛል",
          stationId: "st-bole",
          fuelTypeId: "ft-benzene",
        },
      },
    ]);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ ok: false, description: "Internal Server Error" }),
    });

    const req = new NextRequest("http://localhost:3000/api/cron/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(1);

    // Should remain PENDING with backoff (30s * 2^1 = 60s)
    expect(notificationRepository.updateDeliveryStatus).toHaveBeenCalledWith(
      "deliv-transient",
      "PENDING",
      expect.objectContaining({
        nextAttemptAt: expect.any(Date),
        incrementAttempts: true,
      })
    );
  });

  it("marks delivery as FAILED when max attempts (5) is reached", async () => {
    vi.mocked(notificationRepository.getPendingDeliveries).mockResolvedValue([
      {
        id: "deliv-maxed",
        notificationId: "notif-4",
        userId: "user-4",
        attempts: 4, // 5th attempt
        telegramUserId: 888888n,
        preferredLocale: "en",
        notification: {
          type: "FUEL_AVAILABLE",
          titleEn: "Alert",
          titleAm: "ማስጠንቀቂያ",
          bodyEn: "Fuel available",
          bodyAm: "ነዳጅ ይገኛል",
          stationId: "st-bole",
          fuelTypeId: "ft-benzene",
        },
      },
    ]);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ ok: false, description: "Bad Gateway" }),
    });

    const req = new NextRequest("http://localhost:3000/api/cron/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toBe(1);

    // Max attempts reached -> FAILED
    expect(notificationRepository.updateDeliveryStatus).toHaveBeenCalledWith(
      "deliv-maxed",
      "FAILED",
      expect.objectContaining({ incrementAttempts: true })
    );
  });
});
