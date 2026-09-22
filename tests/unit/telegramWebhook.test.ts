import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import { NextRequest } from "next/server";

// Mock fetch for Telegram Bot API
const mockFetch = vi.fn();
global.fetch = mockFetch;

const SECRET = "test-webhook-secret-123456";
const BOT_TOKEN = "123456:ABC-DEF";

describe("Telegram Webhook Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    process.env.NEXT_PUBLIC_APP_URL = "https://taf.example.com";

    // Default Telegram API returns success
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 99 } }),
      text: async () => JSON.stringify({ ok: true }),
    });
  });

  it("returns 401 Unauthorized if secret token header is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 Unauthorized if secret token header does not match", async () => {
    const req = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": "wrong-secret-token",
      },
      body: JSON.stringify({ update_id: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("accepts valid secret token and dispatches /start command", async () => {
    const req = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": SECRET,
      },
      body: JSON.stringify({
        update_id: 100,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 123456, type: "private" },
          from: { id: 123456, first_name: "Dawit", language_code: "en" },
          text: "/start",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Verify Telegram API was called to send welcome message
    expect(mockFetch).toHaveBeenCalled();
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("sendMessage");
    const payload = JSON.parse(init.body);
    expect(payload.chat_id).toBe(123456);
    expect(payload.text).toContain("TAF Fuel Finder");
  });

  it("dispatches /help command", async () => {
    const req = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": SECRET,
      },
      body: JSON.stringify({
        update_id: 101,
        message: {
          message_id: 2,
          date: 1700000000,
          chat: { id: 123456, type: "private" },
          from: { id: 123456, first_name: "Dawit", language_code: "en" },
          text: "/help",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalled();
    const [, init] = mockFetch.mock.calls[0]!;
    const payload = JSON.parse(init.body);
    expect(payload.text).toContain("Available Commands");
  });

  it("handles callback query for nearest stations", async () => {
    const req = new NextRequest("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": SECRET,
      },
      body: JSON.stringify({
        update_id: 102,
        callback_query: {
          id: "cq-1",
          from: { id: 123456, first_name: "Dawit" },
          data: "cmd_nearest",
          message: {
            message_id: 3,
            date: 1700000000,
            chat: { id: 123456, type: "private" },
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalled();

    // Verify answerCallbackQuery was called
    const answerCall = mockFetch.mock.calls.find(([url]) => url.includes("answerCallbackQuery"));
    expect(answerCall).toBeDefined();
  });
});
