import { NextResponse, type NextRequest } from "next/server";
import { notificationRepository } from "@/repositories/notificationRepository";
import {
  sendTelegramMessage,
  TelegramBlockedError,
  TelegramRateLimitError,
} from "@/lib/telegram/bot";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const TARGET_DELAY_MS = 40; // ~25 msgs per second

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Development mode allow
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const cronHeader = req.headers.get("x-vercel-cron");
  return !!cronHeader;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  const appUrl = process.env.TELEGRAM_MINI_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Pull pending deliveries
  const deliveries = await notificationRepository.getPendingDeliveries(BATCH_SIZE);
  if (deliveries.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, blocked: 0, failed: 0 });
  }

  let sentCount = 0;
  let blockedCount = 0;
  let failedCount = 0;

  for (const d of deliveries) {
    const isAm = d.preferredLocale === "am";
    const title = isAm ? d.notification.titleAm : d.notification.titleEn;
    const body = isAm ? d.notification.bodyAm : d.notification.bodyEn;
    const text = `${title}\n\n${body}`;

    const stationId = d.notification.stationId;
    const webAppUrl = stationId ? `${appUrl}/stations/${stationId}` : appUrl;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: isAm ? "📍 ማደያውን ይመልከቱ (View Station)" : "📍 View Station & Directions",
            web_app: { url: webAppUrl },
          },
        ],
      ],
    };

    try {
      await sendTelegramMessage(botToken, Number(d.telegramUserId), text, {
        replyMarkup,
      });

      await notificationRepository.updateDeliveryStatus(d.id, "SENT", {
        sentAt: new Date(),
        incrementAttempts: true,
      });
      sentCount++;
    } catch (err: unknown) {
      if (err instanceof TelegramBlockedError) {
        await notificationRepository.updateDeliveryStatus(d.id, "BLOCKED", {
          error: err.message,
          incrementAttempts: true,
        });
        blockedCount++;
      } else if (err instanceof TelegramRateLimitError) {
        // Back off based on Telegram's retry_after
        const nextAttempt = new Date(Date.now() + err.retryAfterSeconds * 1000);
        await notificationRepository.updateDeliveryStatus(d.id, "PENDING", {
          error: err.message,
          nextAttemptAt: nextAttempt,
          incrementAttempts: true,
        });
        failedCount++;
        // Pause loop for a short while
        await sleep(Math.min(err.retryAfterSeconds * 1000, 2000));
      } else {
        const nextAttempts = d.attempts + 1;
        const errMsg = err instanceof Error ? err.message : String(err);

        if (nextAttempts >= MAX_ATTEMPTS) {
          await notificationRepository.updateDeliveryStatus(d.id, "FAILED", {
            error: errMsg,
            incrementAttempts: true,
          });
          failedCount++;
        } else {
          // Exponential backoff: 30s * 2^(attempts)
          const backoffSec = 30 * Math.pow(2, d.attempts);
          const nextAttempt = new Date(Date.now() + backoffSec * 1000);
          await notificationRepository.updateDeliveryStatus(d.id, "PENDING", {
            error: errMsg,
            nextAttemptAt: nextAttempt,
            incrementAttempts: true,
          });
          failedCount++;
        }
      }
    }

    // Rate-throttle to ~25 msg/s
    await sleep(TARGET_DELAY_MS);
  }

  return NextResponse.json({
    processed: deliveries.length,
    sent: sentCount,
    blocked: blockedCount,
    failed: failedCount,
  });
}
