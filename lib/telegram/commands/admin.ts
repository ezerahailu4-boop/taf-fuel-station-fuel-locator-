import type { TelegramMessage, TelegramInlineKeyboardMarkup } from "@/types/notifications";
import { userRepository } from "@/repositories/userRepository";
import { sendTelegramMessage } from "../bot";

export async function handleAdminCommand(
  msg: TelegramMessage,
  botToken: string,
  appUrl: string
): Promise<void> {
  const isAmharic = msg.from?.language_code?.toLowerCase().startsWith("am");
  const tgId = msg.from?.id ? BigInt(msg.from.id) : null;

  if (!tgId) {
    await sendTelegramMessage(
      botToken,
      msg.chat.id,
      isAmharic ? "የተጠቃሚ መለያ ማግኘት አልተቻለም።" : "User identification not found."
    );
    return;
  }

  const user = await userRepository.findByTelegramId(tgId);
  const isStaff = user && (user.role === "SUPER_ADMIN" || user.role === "BRANCH_ADMIN" || user.role === "VIEWER");

  if (!isStaff) {
    const deniedText = isAmharic
      ? "🔒 **ይህ ክፍል ለTAF ሠራተኞች እና አስተዳዳሪዎች ብቻ የተፈቀደ ነው።**\n\nእርስዎ የማደያ ኃላፊ ከሆኑ፣ እባክዎ ዋና አስተዳዳሪውን (Super Admin) ያነጋግሩ።"
      : "🔒 **This area is restricted to TAF station staff and administrators.**\n\nIf you are a branch manager, please contact your Super Admin to be registered.";
    await sendTelegramMessage(botToken, msg.chat.id, deniedText);
    return;
  }

  const roleText = user.role === "SUPER_ADMIN"
    ? (isAmharic ? "ዋና አስተዳዳሪ (Super Admin)" : "Super Administrator")
    : user.role === "BRANCH_ADMIN"
    ? (isAmharic ? "የቅርንጫፍ ኃላፊ (Branch Admin)" : "Branch Administrator")
    : (isAmharic ? "ተመልካች (Viewer)" : "Viewer");

  let statsText = "";
  if (user.role === "SUPER_ADMIN") {
    try {
      const totalUsers = await userRepository.getTotalUserCount();
      statsText = isAmharic
        ? `\n\n📊 **የቦቱ አጠቃላይ ሁኔታ፦**\n• 👥 **ጠቅላላ የቦት ተጠቃሚዎች፦** ${totalUsers} ተመዝግበዋል`
        : `\n\n📊 **Bot Live Status:**\n• 👥 **Total Registered Users:** ${totalUsers} users`;
    } catch (err) {
      console.warn("[adminCommand] Failed to fetch total users:", err);
    }
  }

  const text = (isAmharic
    ? `👨‍💼 **የTAF ሠራተኞች መግቢያ**\n\nሰላም ${user.firstName}፣ እርስዎ እንደ **${roleText}** ተመዝግበዋል።\n\nከዚህ በታች ያሉትን አማራጮች በመጠቀም የነዳጅ ሁኔታ ማዘመን ወይም ዳሽቦርድ መክፈት ይችላሉ፦`
    : `👨‍💼 **TAF Staff Portal**\n\nHello ${user.firstName}, you are signed in as **${roleText}**.\n\nUse the buttons below to manage station fuel availability or open your management dashboard:`) + statsText;

  const buttons: TelegramInlineKeyboardMarkup["inline_keyboard"] = [];

  if (user.role === "SUPER_ADMIN") {
    buttons.push([
      {
        text: isAmharic ? "👑 የዋና አስተዳዳሪ ዳሽቦርድ (Super Admin)" : "👑 Super Admin Dashboard",
        web_app: { url: `${appUrl}/admin` },
      },
    ]);
  }

  if (user.role === "BRANCH_ADMIN" || user.role === "SUPER_ADMIN") {
    buttons.push([
      {
        text: isAmharic ? "⚡ የቅርንጫፍ ሁኔታ ማዘመኛ (Branch Portal)" : "⚡ Branch Admin Portal",
        web_app: { url: `${appUrl}/branch` },
      },
    ]);
  }

  buttons.push([
    {
      text: isAmharic ? "🌐 የድረ-ገጽ ዳሽቦርድ መግቢያ" : "🌐 Web Admin Sign In",
      web_app: { url: `${appUrl}/login` },
    },
  ]);

  await sendTelegramMessage(botToken, msg.chat.id, text, {
    replyMarkup: { inline_keyboard: buttons },
  });
}
