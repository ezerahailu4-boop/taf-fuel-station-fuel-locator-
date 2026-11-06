import type { TelegramMessage, TelegramContact } from "@/types/notifications";
import { sendTelegramMessage } from "../bot";
import { normalizePhone, formatPhoneDisplay } from "@/lib/phone";
import { getDb } from "@/lib/db";

export async function handleContactReceived(
  msg: TelegramMessage,
  contact: TelegramContact,
  botToken: string,
  appUrl: string,
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");
  const tgId = msg.from?.id ? BigInt(msg.from.id) : null;

  if (!tgId) return;

  const rawPhone = contact.phone_number;
  const normalized = normalizePhone(rawPhone);
  const formatted = formatPhoneDisplay(normalized);

  const db = getDb();

  // Update or register user with their verified phone number
  const user = await db.user.upsert({
    where: { telegramUserId: tgId },
    update: {
      phone: normalized,
      firstName: msg.from?.first_name || contact.first_name || "User",
      lastName: msg.from?.last_name || contact.last_name || null,
      username: msg.from?.username || null,
      isActive: true,
    },
    create: {
      telegramUserId: tgId,
      firstName: msg.from?.first_name || contact.first_name || "User",
      lastName: msg.from?.last_name || contact.last_name || null,
      username: msg.from?.username || null,
      phone: normalized,
      role: "CUSTOMER",
      isActive: true,
    },
    include: {
      stationAdmin: {
        include: {
          station: { select: { branchName: true, name: true } },
        },
      },
    },
  });

  const assignedStation = user.stationAdmin?.station?.branchName;
  const isBranchAdmin = user.role === "BRANCH_ADMIN" && Boolean(assignedStation);

  let replyText = "";
  if (isBranchAdmin) {
    replyText = isAmharic
      ? `✅ **ስልክ ቁጥርዎ በተሳካ ሁኔታ ተገናኝቷል!**\n📞 ${formatted}\n\n🏢 እርስዎ የ**TAF ${assignedStation}** ማደያ ኃላፊ ሆነው ተመድበዋል።\n\nከዚህ በታች ያለውን ቁልፍ በመጫን የነዳጅ ሁኔታን በቀጥታ ማዘመን ይችላሉ፦`
      : `✅ **Phone number successfully linked!**\n📞 ${formatted}\n\n🏢 You are assigned as Branch Staff for **TAF ${assignedStation}**.\n\nTap below to open your branch management portal:`;
  } else {
    replyText = isAmharic
      ? `✅ **ስልክ ቁጥርዎ በተሳካ ሁኔታ ተመዝግቧል!**\n📞 ${formatted}\n\nየTAF ዋና አስተዳዳሪ እንደ ቅርንጫፍ ኃላፊ ሲመድብዎት ማሳወቂያ ይደርስዎታል።`
      : `✅ **Phone number successfully linked to your Telegram account!**\n📞 ${formatted}\n\nWhen a TAF administrator assigns you to a branch, you will automatically be granted access.`;
  }

  // Send confirmation
  await sendTelegramMessage(botToken, msg.chat.id, replyText, {
    parseMode: "MarkdownV2",
    replyMarkup: isBranchAdmin
      ? {
          inline_keyboard: [
            [
              {
                text: isAmharic ? "⚡ የማደያ ፖርታል ክፈት" : "⚡ Open Branch Fuel Portal",
                web_app: { url: `${appUrl}/branch` },
              },
            ],
            [
              {
                text: isAmharic ? "🚀 ዋና መተግበሪያ" : "🚀 Open TAF Mini App",
                web_app: { url: appUrl },
              },
            ],
          ],
        }
      : {
          remove_keyboard: true,
        },
  }).catch(async () => {
    // Fallback without Markdown
    await sendTelegramMessage(botToken, msg.chat.id, replyText.replace(/[*_~`]/g, ""), {
      replyMarkup: { remove_keyboard: true },
    });
  });
}

