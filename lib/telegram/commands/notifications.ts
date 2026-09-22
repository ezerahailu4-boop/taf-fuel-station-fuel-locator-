import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { userRepository } from "@/repositories/userRepository";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";
import { sendTelegramMessage } from "../bot";

export async function handleNotificationsCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");
  const tgId = msg.from?.id ? BigInt(msg.from.id) : null;

  let subsText = "";
  if (tgId) {
    const user = await userRepository.findByTelegramId(tgId);
    if (user) {
      const subs = await subscriptionRepository.listByUser(user.id);
      if (subs.length > 0) {
        subsText = isAmharic
          ? `\n\n📌 **የእርስዎ ንቁ ማሳወቂያዎች (${subs.length})**፦\n`
          : `\n\n📌 **Your Active Subscriptions (${subs.length})**:\n`;

        for (const sub of subs) {
          const branch = sub.station?.branchName ?? "Station";
          const fuel = sub.fuelType?.nameEn ?? "Fuel";
          subsText += `• ${fuel} @ TAF ${branch}\n`;
        }
      }
    }
  }

  const text = isAmharic
    ? `🔔 **የነዳጅ ማሳወቂያዎች (Fuel Alerts)**\n\nየተመረጠ ማደያ ላይ ነዳጅ ሲመጣ በቴሌግራም ፈጣን መልዕክት ይደርስዎታል!${subsText}\n\nአዳዲስ ማሳወቂያዎችን ለማከል ወይም ለማስተካከል ከዚህ በታች ያለውን ቁልፍ ይጫኑ፦`
    : `🔔 **Fuel Availability Alerts**\n\nGet instant Telegram alerts as soon as fuel is reported available at your chosen TAF stations!${subsText}\n\nTo add or manage your subscriptions, tap the button below:`;

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        {
          text: isAmharic ? "🔔 ማሳወቂያዎችን አስተዳድር (My Alerts)" : "🔔 Manage My Alerts",
          web_app: { url: `${appUrl}/alerts` },
        },
      ],
      [
        {
          text: isAmharic ? "⛽ ማደያዎችን ፈልግ" : "⛽ Browse Stations",
          web_app: { url: `${appUrl}/stations` },
        },
      ],
    ],
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, { replyMarkup });
}
