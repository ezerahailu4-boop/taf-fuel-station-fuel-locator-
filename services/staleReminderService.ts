import { getDb } from "@/lib/db";
import { isStale } from "@/lib/fuel/display";
import { sendTelegramMessage } from "@/lib/telegram/bot";

export interface StaleReminderResult {
  checkedStations: number;
  staleStations: number;
  remindersSent: number;
}

export async function processStaleStationReminders(options?: {
  botToken?: string;
  staleAfterMinutes?: number;
}): Promise<StaleReminderResult> {
  const db = getDb();
  const botToken = options?.botToken ?? process.env.TELEGRAM_BOT_TOKEN;

  // Read settings
  const staleSetting = await db.setting.findUnique({ where: { key: "stale_after_minutes" } });
  const staleMinutes = options?.staleAfterMinutes ?? (typeof staleSetting?.value === "number" ? staleSetting.value : 120);

  // Fetch active stations with their latest fuel statuses and assigned admin
  const stations = await db.station.findMany({
    where: { isActive: true, status: "OPEN" },
    include: {
      fuelStatuses: {
        select: {
          lastUpdated: true,
          lastConfirmedAt: true,
        },
      },
      admins: {
        include: {
          user: {
            select: {
              telegramUserId: true,
              firstName: true,
              preferredLocale: true,
            },
          },
        },
      },
    },
  });

  let staleCount = 0;
  let sentCount = 0;
  const now = new Date();

  for (const s of stations) {
    const admin = s.admins[0]?.user;
    if (!admin?.telegramUserId) continue;

    // Find the latest timestamp across all fuels at this station
    let latestTime: Date | null = null;
    for (const st of s.fuelStatuses) {
      const t = st.lastConfirmedAt > st.lastUpdated ? st.lastConfirmedAt : st.lastUpdated;
      if (!latestTime || t > latestTime) latestTime = t;
    }

    if (!latestTime || isStale(latestTime, now, staleMinutes)) {
      staleCount++;

      // Check if we already reminded this station in the last 4 hours to avoid spamming
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const recentReminder = await db.activityLog.findFirst({
        where: {
          stationId: s.id,
          action: "STALE_REMINDER_SENT",
          createdAt: { gte: fourHoursAgo },
        },
      });

      if (!recentReminder && botToken) {
        const isAmharic = admin.preferredLocale === "am";

        const text = isAmharic
          ? `⚠️ ሰላም ${admin.firstName}፣ የ${s.branchName} ታፍ ማደያ የነዳጅ መረጃ ከተዘመነ ${staleMinutes} ደቂቃዎች አልፈዋል። እባክዎ መረጃው ትክክለኛ መሆኑን በቦቱ ወይም በቅርንጫፍ አስተዳዳሪ ገጽ ያረጋግጡ ("አሁንም ትክክል ነው ✓")።`
          : `⚠️ Hello ${admin.firstName}, fuel availability for TAF ${s.branchName} has not been updated in over ${staleMinutes} minutes. Please confirm or update the status in the app ("Still accurate ✓").`;

        try {
          await sendTelegramMessage(botToken, Number(admin.telegramUserId), text);
          sentCount++;

          // Record activity log for cooldown
          await db.activityLog.create({
            data: {
              stationId: s.id,
              actorUserId: null,
              action: "STALE_REMINDER_SENT",
              entity: "station",
              newValue: { staleMinutes, sentAt: now.toISOString() },
            },
          });
        } catch (err) {
          console.error(`[stale-reminder] Failed to send reminder to admin of ${s.branchName}:`, err);
        }
      }
    }
  }

  return {
    checkedStations: stations.length,
    staleStations: staleCount,
    remindersSent: sentCount,
  };
}
