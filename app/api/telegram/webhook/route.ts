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
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!verifySecretToken(secretHeader, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.TELEGRAM_MINI_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
