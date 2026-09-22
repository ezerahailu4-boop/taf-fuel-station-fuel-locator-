import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { sendTelegramMessage } from "../bot";

export async function handleStartCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const name = msg.from?.first_name ?? "there";
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");

  const text = isAmharic
    ? `👋 ሰላም ${name}!\n\nወደ **ታፍ ነዳጅ ፈላጊ (TAF Fuel Finder)** እንኳን በደህና መጡ።\n\nበዚህ ቦት በመጠቀም፦\n• በአቅራቢያዎ የሚገኙ የTAF ማደያዎችን ማግኘት ይችላሉ\n• ቤንዚን፣ ናፍጣ ወይም ሌላ ነዳጅ መኖሩን በቀጥታ መከታተል ይችላሉ\n• ነዳጅ ሲመጣ ፈጣን የቴሌግራም መልዕክት ይደርስዎታል\n\n*ማሳሰቢያ፦ መረጃው በማደያዎች የተዘገበ ወቅታዊ የነዳጅ ሁኔታ ነው። ሁኔታዎች በማንኛውም ጊዜ ሊለወጡ ይችላሉ።*`
    : `👋 Hello ${name}!\n\nWelcome to **TAF Fuel Finder**.\n\nWith this bot, you can:\n• Find TAF stations near you\n• Check real-time reported availability for Benzene, Diesel, and more\n• Subscribe to alerts when fuel arrives at your favorite station\n\n*Note: Reported availability. Fuel availability can change at any time.*`;

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
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
