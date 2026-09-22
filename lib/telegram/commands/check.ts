import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { stationRepository } from "@/repositories/stationRepository";
import { sendTelegramMessage } from "../bot";

export async function handleCheckCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");
  const { items: stations } = await stationRepository.list({
    includeInactive: false,
    page: 1,
    pageSize: 6,
  });

  const text = isAmharic
    ? "🔍 የትኛውን ማደያ ሁኔታ ማየት ይፈልጋሉ? ከዚህ በታች ካሉት ማደያዎች አንዱን ይምረጡ ወይም ሁሉንም በመተግበሪያው ይመልከቱ፦"
    : "🔍 Which station would you like to check? Select a branch below or open the Mini App for full details:";

  const buttons = stations.map((s) => [
    {
      text: `⛽ TAF ${s.branchName} (${s.city})`,
      web_app: { url: `${appUrl}/stations/${s.id}` },
    },
  ]);

  buttons.push([
    {
      text: isAmharic ? "📱 ሙሉውን መተግበሪያ ክፈት" : "📱 Open Full Mini App",
      web_app: { url: appUrl },
    },
  ]);

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: buttons,
  };

  await sendTelegramMessage(botToken, msg.chat.id, text, { replyMarkup });
}
