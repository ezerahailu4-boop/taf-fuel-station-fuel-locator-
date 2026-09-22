import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { stationDeps } from "@/services/deps";
import { listPublicStations } from "@/services/stationService";
import { sendTelegramMessage } from "../bot";

function statusSymbol(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "🟢";
    case "LIMITED":
      return "🟡";
    case "OUT_OF_STOCK":
      return "🔴";
    default:
      return "⚪";
  }
}

export async function handleStationsCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");
  const { items: stations } = await listPublicStations(stationDeps(), {
    page: 1,
    pageSize: 8,
  });

  if (stations.length === 0) {
    const emptyMsg = isAmharic
      ? "በአሁኑ ሰዓት የተዘገበ የTAF ማደያ አልተገኘም።"
      : "No active TAF fuel stations found.";
    await sendTelegramMessage(botToken, msg.chat.id, emptyMsg);
    return;
  }

  let text = isAmharic
    ? "⛽ **የTAF ነዳጅ ማደያዎች ወቅታዊ ሁኔታ**\n\n"
    : "⛽ **TAF Fuel Stations Current Status**\n\n";

  for (const s of stations) {
    text += `📍 **TAF ${s.branchName}** (${s.area ? `${s.area}, ` : ""}${s.city})\n`;
    const fuelsSummary = s.fuels
      .map((f) => `${statusSymbol(f.status)} ${f.nameEn}: ${f.status === "AVAILABLE" ? (isAmharic ? "አለ" : "Avail") : f.status === "LIMITED" ? (isAmharic ? "ውስን" : "Ltd") : (isAmharic ? "የለም" : "Out")}`)
      .join(" · ");
    text += `${fuelsSummary || (isAmharic ? "መረጃ የለም" : "No reports")}\n\n`;
  }

  text += isAmharic
    ? "🟢 አለ  🟡 ውስን  🔴 የለም\n*የተሟላ መረጃ እና አቅጣጫዎችን በመተግበሪያው ይመልከቱ*"
    : "🟢 Available  🟡 Limited  🔴 Out of Stock\n*Open the Mini App for full details and directions*";

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        {
          text: isAmharic ? "🗺️ በካርታ ላይ ይመልከቱ" : "🗺️ View on Map",
          web_app: { url: `${appUrl}/map` },
        },
        {
          text: isAmharic ? "📋 ሁሉም ማደያዎች" : "📋 All Stations",
          web_app: { url: `${appUrl}/stations` },
        },
      ],
    ],
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, {
    replyMarkup,
  });
}
