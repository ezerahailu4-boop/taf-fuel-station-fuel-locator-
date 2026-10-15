import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dispatchTelegramUpdate } from "@/lib/telegram/commands";
import type { TelegramUpdate } from "@/types/notifications";

function verifySecretToken(headerToken: string | null, secret: string | undefined): boolean {
  if (!headerToken || !secret) return false;
  if (headerToken.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(headerToken), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "taf_fuel_secret_webhook_key_2026_secure";

  if (!verifySecretToken(secretHeader, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || "8837896206:AAEZjh_QyBOvNJTfRFue2hrhQ4hrsJ0LPKM";
  const rawUrl = process.env.TELEGRAM_MINI_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const appUrl = (rawUrl && !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1")
    ? rawUrl
    : "https://taf-fuel-station-fuel-locator.vercel.app").replace(/\/$/, "");

  if (!botToken) {
    console.error("[telegram-webhook] TELEGRAM_BOT_TOKEN is not configured");
    return NextResponse.json({ ok: true });
  }

  try {
    const update = (await req.json()) as TelegramUpdate;
    if (update && typeof update === "object" && "update_id" in update) {
      await dispatchTelegramUpdate(update, botToken, appUrl);
    }
  } catch (err) {
    console.error("[telegram-webhook] Failed to process update:", err);
  }

  // Telegram expects 200 OK for every handled update
  return NextResponse.json({ ok: true });
}
