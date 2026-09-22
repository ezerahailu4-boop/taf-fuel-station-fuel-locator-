import type {
  TelegramMessage,
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
  TelegramLocation,
} from "@/types/notifications";
import { nearbyDeps } from "@/services/deps";
import { findNearby } from "@/services/nearbyService";
import { formatDistance } from "@/lib/geo/haversine";
import { sendTelegramMessage } from "../bot";

export async function handleNearestCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");

  const text = isAmharic
    ? "📍 በአቅራቢያዎ የሚገኙ የTAF ማደያዎችን ለማግኘት፦\nከዚህ በታች ያለውን **'አካባቢዎን ያጋሩ'** የሚለውን ቁልፍ ይጫኑ ወይም መተግበሪያውን ይክፈቱ።"
    : "📍 To find the nearest TAF stations:\nTap **'Send Location'** below or open the Mini App.";

  const inlineMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        {
          text: isAmharic ? "📍 በመተግበሪያው ፈልግ (Mini App)" : "📍 Find Nearest in Mini App",
          web_app: { url: `${appUrl}/nearest` },
        },
      ],
    ],
  };

  const replyMarkup: TelegramReplyKeyboardMarkup = {
    keyboard: [
      [
        {
          text: isAmharic ? "📍 አካባቢዎን ያጋሩ (Share Location)" : "📍 Send Location",
          request_location: true,
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, {
    replyMarkup: inlineMarkup,
  });
  await sendTelegramMessage(
    botToken,
    msg.chat.id,
    isAmharic ? "ወይም አካባቢዎን በቀጥታ ያጋሩ፦" : "Or share your live location directly:",
    { replyMarkup }
  );
}

export async function handleLocationReceived(
  msg: TelegramMessage,
  loc: TelegramLocation,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");
  const response = await findNearby(nearbyDeps(), {
    lat: loc.latitude,
    lng: loc.longitude,
    limit: 3,
  });

  const ranked = response.items;

  if (ranked.length === 0) {
    const empty = isAmharic
      ? "በአቅራቢያዎ ምንም የTAF ማደያ አልተገኘም።"
      : "No active TAF fuel stations found near you.";
    await sendTelegramMessage(botToken, msg.chat.id, empty);
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  let text = isAmharic
    ? "📍 **ለእርስዎ በጣም ቅርብ የሆኑ የTAF ማደያዎች**፦\n\n"
    : "📍 **Nearest TAF Stations to you**:\n\n";

  for (let i = 0; i < ranked.length; i++) {
    const item = ranked[i];
    if (!item) continue;
    const s = item.station;
    const dist = formatDistance(item.distanceKm);
    const medal = medals[i] || "•";

    text += `${medal} **TAF ${s.branchName}** (${dist})\n`;
    text += `   📍 ${s.address}\n`;
    const fuels = s.fuels
      .map((f) => `${f.status === "AVAILABLE" ? "🟢" : f.status === "LIMITED" ? "🟡" : "🔴"} ${f.nameEn}`)
      .join(" · ");
    text += `   ⛽ ${fuels || (isAmharic ? "መረጃ የለም" : "No info")}\n\n`;
  }

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: ranked.map((r) => [
      {
        text: `🗺️ TAF ${r.station.branchName} (${formatDistance(r.distanceKm)})`,
        web_app: { url: `${appUrl}/stations/${r.station.id}` },
      },
    ]),
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, { replyMarkup });
}
