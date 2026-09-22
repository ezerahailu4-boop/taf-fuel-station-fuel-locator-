import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { sendTelegramMessage } from "../bot";

export async function handleHelpCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");

  const text = isAmharic
    ? `ℹ️ **የTAF Fuel Finder እገዛ**\n\nይህ ቦት በኢትዮጵያ የሚገኙ የTAF ነዳጅ ማደያዎችን እና ወቅታዊ የነዳጅ ሁኔታዎችን በቀላሉ ለማግኘት ያገለግላል።\n\n**የትዕዛዞች ዝርዝር፦**\n/start - ቦቱን ለመጀመር እና ዋናውን መተግበሪያ ለመክፈት\n/nearest - በአቅራቢያዎ የሚገኙ ማደያዎችን ለመፈለግ\n/stations - የሁሉንም ማደያዎች የነዳጅ ሁኔታ ለማየት\n/check - የአንድን ማደያ ሁኔታ ለመፈተሽ\n/notifications - የነዳጅ ማሳወቂያዎችን ለማስተዳደር\n/admin - የማደያ ኃላፊዎች መግቢያ\n/help - ይህን የእገዛ መልዕክት ለማየት\n\n*ማሳሰቢያ፦ መረጃው በማደያዎች የተዘገበ ወቅታዊ የነዳጅ ሁኔታ ነው። ሁኔታዎች በማንኛውም ጊዜ ሊለወጡ ይችላሉ።*`
    : `ℹ️ **TAF Fuel Finder Help & Guide**\n\nFind TAF fuel stations in Ethiopia and stay informed with real-time reported fuel availability.\n\n**Available Commands:**\n/start - Start the bot & launch the Mini App\n/nearest - Find TAF stations closest to you\n/stations - View all stations & fuel status\n/check - Quick check a specific station\n/notifications - Manage fuel arrival alerts\n/admin - Station staff sign in & management\n/help - Show this guide\n\n*Disclaimer: Reported availability. Fuel availability can change at any time.*`;

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        {
          text: isAmharic ? "🚀 መተግበሪያውን ክፈት" : "🚀 Open Mini App",
          web_app: { url: appUrl },
        },
      ],
    ],
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, { replyMarkup });
}
