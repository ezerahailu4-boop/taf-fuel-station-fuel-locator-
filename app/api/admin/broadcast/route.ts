import { NextResponse } from "next/server";
import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { z } from "zod";

const broadcastSchema = z.object({
  titleEn: z.string().trim().min(2, "Title is required").max(150),
  titleAm: z.string().trim().max(150).optional().nullable(),
  bodyEn: z.string().trim().min(3, "Message body is required").max(2000),
  bodyAm: z.string().trim().max(2000).optional().nullable(),
  targetAudience: z.enum(["ALL", "TELEGRAM_ONLY", "CUSTOMERS", "STAFF"]).default("ALL"),
  stationId: z.string().uuid().optional().nullable(),
  sendTelegram: z.boolean().default(true),
  sendInApp: z.boolean().default(true),
});

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN");

  const db = getDb();

  // 1. Gather audience metrics
  const [totalUsers, telegramUsers, customers, staff] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { isActive: true, telegramUserId: { gt: 0n } } }),
    db.user.count({ where: { isActive: true, role: "CUSTOMER" } }),
    db.user.count({
      where: {
        isActive: true,
        role: { in: ["BRANCH_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"] },
      },
    }),
  ]);

  // 2. Fetch recent broadcast announcements
  const rawBroadcasts = await db.notification.findMany({
    where: { type: "ANNOUNCEMENT" },
    take: 25,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
        },
      },
      station: {
        select: {
          id: true,
          name: true,
          branchName: true,
          city: true,
        },
      },
      _count: {
        select: {
          deliveries: true,
          inApp: true,
        },
      },
      deliveries: {
        select: {
          status: true,
        },
      },
    },
  });

  const broadcasts = rawBroadcasts.map((b) => {
    let sent = 0;
    let pending = 0;
    let failed = 0;
    for (const d of b.deliveries) {
      if (d.status === "SENT") sent++;
      else if (d.status === "PENDING") pending++;
      else if (d.status === "FAILED") failed++;
    }

    return {
      id: b.id,
      titleEn: b.titleEn,
      titleAm: b.titleAm,
      bodyEn: b.bodyEn,
      bodyAm: b.bodyAm,
      createdAt: b.createdAt.toISOString(),
      station: b.station,
      createdBy: b.createdBy,
      totalInApp: b._count.inApp,
      totalTelegram: b._count.deliveries,
      telegramSent: sent,
      telegramPending: pending,
      telegramFailed: failed,
      audience: b.audience,
    };
  });

  return json({
    audience: {
      totalUsers,
      telegramUsers,
      customers,
      staff,
    },
    broadcasts,
  });
});

export const POST = handle(async (req) => {
  const { actor } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN");

  const body = await req.json();
  const input = broadcastSchema.parse(body);

  const db = getDb();

  // 1. Resolve targeted users
  const whereClause: any = {
    isActive: true,
  };

  if (input.targetAudience === "TELEGRAM_ONLY") {
    whereClause.telegramUserId = { gt: 0n };
  } else if (input.targetAudience === "CUSTOMERS") {
    whereClause.role = "CUSTOMER";
  } else if (input.targetAudience === "STAFF") {
    whereClause.role = { in: ["BRANCH_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"] };
  }

  const users = await db.user.findMany({
    where: whereClause,
    select: {
      id: true,
      telegramUserId: true,
      preferredLocale: true,
      firstName: true,
    },
  });

  if (users.length === 0) {
    return json({ error: "No active users match the selected target audience." }, { status: 400 });
  }

  const titleAm = input.titleAm?.trim() || input.titleEn;
  const bodyAm = input.bodyAm?.trim() || input.bodyEn;

  // 2. Persist notification and recipient rows in a transaction
  const notification = await db.$transaction(async (tx) => {
    const notif = await tx.notification.create({
      data: {
        type: "ANNOUNCEMENT",
        titleEn: input.titleEn,
        titleAm,
        bodyEn: input.bodyEn,
        bodyAm,
        stationId: input.stationId || null,
        createdById: actor.id,
        audience: {
          target: input.targetAudience,
          totalTargeted: users.length,
          sendTelegram: input.sendTelegram,
          sendInApp: input.sendInApp,
        },
      },
    });

    // In-App inbox notifications for all matching users
    if (input.sendInApp) {
      await tx.inAppNotification.createMany({
        data: users.map((u) => ({
          notificationId: notif.id,
          userId: u.id,
        })),
        skipDuplicates: true,
      });
    }

    // Telegram deliveries for users with telegramUserId
    if (input.sendTelegram) {
      const tgUsers = users.filter((u) => Boolean(u.telegramUserId));
      if (tgUsers.length > 0) {
        await tx.notificationDelivery.createMany({
          data: tgUsers.map((u) => ({
            notificationId: notif.id,
            userId: u.id,
            status: "PENDING",
            attempts: 0,
            nextAttemptAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }
    }

    // Audit log
    await tx.activityLog.create({
      data: {
        actorUserId: actor.id,
        stationId: input.stationId || null,
        action: "BROADCAST_SENT",
        entity: "Notification",
        newValue: {
          notificationId: notif.id,
          targetAudience: input.targetAudience,
          recipientCount: users.length,
          titleEn: input.titleEn,
        },
      },
    });

    return notif;
  });

  // 3. Initiate immediate background delivery to Telegram users if configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramUsers = input.sendTelegram ? users.filter((u) => Boolean(u.telegramUserId)) : [];

  if (botToken && telegramUsers.length > 0) {
    const rawUrl = process.env.TELEGRAM_MINI_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const appUrl = (rawUrl && !rawUrl.includes("localhost") && !rawUrl.includes("127.0.0.1")
      ? rawUrl
      : "https://taf-fuel-station-fuel-locator.vercel.app").replace(/\/$/, "");

    const stationUrl = input.stationId ? `${appUrl}/stations/${input.stationId}` : appUrl;

    // Send in asynchronous background worker without blocking HTTP response
    (async () => {
      for (const u of telegramUsers) {
        const isAm = u.preferredLocale === "am";
        const title = isAm ? titleAm : input.titleEn;
        const msgBody = isAm ? bodyAm : input.bodyEn;
        const text = `📢 *${title}*\n\n${msgBody}`;

        const replyMarkup = {
          inline_keyboard: [
            [
              {
                text: isAm ? "⛽ መተግበሪያውን ይክፈቱ (Open App)" : "⛽ Open TAF Fuel Finder",
                web_app: { url: stationUrl },
              },
            ],
          ],
        };

        try {
          await sendTelegramMessage(botToken, Number(u.telegramUserId), text, {
            parseMode: "MarkdownV2",
            replyMarkup,
          }).catch(() =>
            // Fallback without parse_mode in case markdown special characters were unescaped
            sendTelegramMessage(botToken, Number(u.telegramUserId), `${title}\n\n${msgBody}`, {
              replyMarkup,
            })
          );

          await db.notificationDelivery.updateMany({
            where: { notificationId: notification.id, userId: u.id },
            data: { status: "SENT", sentAt: new Date(), attempts: 1 },
          });
        } catch (sendErr) {
          console.warn(`[Broadcast Delivery] Failed for user ${u.id}:`, sendErr);
          await db.notificationDelivery.updateMany({
            where: { notificationId: notification.id, userId: u.id },
            data: { status: "FAILED", attempts: 1, error: String(sendErr).slice(0, 200) },
          });
        }

        // Small interval to respect Telegram rate limits (25 msgs/sec max)
        await new Promise((r) => setTimeout(r, 45));
      }
    })().catch((err) => console.error("[Broadcast Background Error]:", err));
  }

  return json({
    success: true,
    notificationId: notification.id,
    recipientCount: users.length,
    telegramCount: telegramUsers.length,
    targetAudience: input.targetAudience,
  });
});
