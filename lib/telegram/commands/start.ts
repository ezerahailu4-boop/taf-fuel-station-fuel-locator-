import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { sendTelegramMessage } from "../bot";
import { userRepository } from "@/repositories/userRepository";
import { notifySuperAdminNewUser } from "../notifyAdmin";

export async function handleStartCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const name = msg.from?.first_name ?? "there";
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");

  let isSuperAdminUser = false;
  let totalUsers = 0;

  if (msg.from?.id) {
    try {
      const reg = await userRepository.recordBotUser({
        id: msg.from.id,
        first_name: msg.from.first_name || "there",
        last_name: msg.from.last_name,
        username: msg.from.username,
        language_code: msg.from.language_code,
      });

      totalUsers = reg.totalUsers;
      isSuperAdminUser =
        reg.user.role === "SUPER_ADMIN" ||
        msg.from.id.toString() === (process.env.SUPER_ADMIN_TELEGRAM_ID || "2074368152");

      // When the user uses the bot for the first time, alert the superadmin with the total user count
      if (reg.isFirstTime) {
        await notifySuperAdminNewUser({
          botToken,
          appUrl,
          newUser: {
            id: msg.from.id,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            username: msg.from.username,
            language_code: msg.from.language_code,
          },
          totalUsers: reg.totalUsers,
        });
      }
    } catch (err) {
      console.warn("[startCommand] Failed to record user or notify admin:", err);
    }
  }

  let adminNote = "";
  if (isSuperAdminUser) {
    adminNote = isAmharic
      ? `\n\n👑 **ዋና አስተዳዳሪ (Super Admin)**\n👥 **በአጠቃላይ ቦቱን የሚጠቀሙ ተጠቃሚዎች፦** ${totalUsers}`
      : `\n\n👑 **Super Admin Mode**\n👥 **Total Bot Users:** ${totalUsers}`;
  }

  const text = (isAmharic
    ? `👋 ሰላም ${name}!\n\nወደ **ታፍ ነዳጅ ፈላጊ (TAF Fuel Finder)** እንኳን በደህና መጡ።\n\nበዚህ ቦት በመጠቀም፦\n• በአቅራቢያዎ የሚገኙ የTAF ማደያዎችን ማግኘት ይችላሉ\n• ቤንዚን ወይም ናፍጣ መኖሩን በቀጥታ መከታተል ይችላሉ\n• ነዳጅ ሲመጣ ፈጣን የቴሌግራም መልዕክት ይደርስዎታል\n\n*ማሳሰቢያ፦ መረጃው በማደያዎች የተዘገበ ወቅታዊ የነዳጅ ሁኔታ ነው። ሁኔታዎች በማንኛውም ጊዜ ሊለወጡ ይችላሉ።*`
    : `👋 Hello ${name}!\n\nWelcome to **TAF Fuel Finder**.\n\nWith this bot, you can:\n• Find TAF stations near you\n• Check real-time reported availability for Benzine and Diesel\n• Subscribe to alerts when fuel arrives at your favorite station\n\n*Note: Reported availability. Fuel availability can change at any time.*`) + adminNote;

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      ...(isSuperAdminUser
        ? [
            [
              {
                text: isAmharic
                  ? `👑 የዋና አስተዳዳሪ ፖርታል (${totalUsers} ተጠቃሚዎች)`
                  : `👑 Super Admin Portal (${totalUsers} Users)`,
                web_app: { url: `${appUrl}/admin` },
              },
            ],
          ]
        : []),
      [
        {
          text: isAmharic ? "🚀 መተግበሪያውን ክፈት (Open Mini App)" : "🚀 Open TAF Mini App",
          web_app: { url: appUrl },
        },
      ],
      [
        {
          text: isAmharic ? "📍 በአቅራቢያ የሚገኙ ማደያዎች" : "📍 Nearest Stations",
          callback_data: "cmd_nearest",
        },
        {
          text: isAmharic ? "⛽ የነዳጅ ሁኔታ ይመልከቱ" : "⛽ Check Fuel Status",
          callback_data: "cmd_stations",
        },
      ],
      [
        {
          text: isAmharic ? "🔔 ማሳወቂያዎቼ (My Alerts)" : "🔔 Manage Alerts",
          web_app: { url: `${appUrl}/alerts` },
        },
      ],
    ],
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, {
    parseMode: "MarkdownV2",
    replyMarkup,
  }).catch(async () => {
    // Fallback without Markdown formatting if special characters collide
    await sendTelegramMessage(botToken, msg.chat.id, text.replace(/[*_~`]/g, ""), {
      replyMarkup,
    });
  });
}
