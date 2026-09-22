import { userRepository } from "@/repositories/userRepository";
import { sendTelegramMessage } from "./bot";
import type { BotUserRegistrationInput } from "@/types/auth";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface NotifySuperAdminParams {
  botToken: string;
  appUrl: string;
  newUser: BotUserRegistrationInput;
  totalUsers: number;
}

/**
 * Sends a real-time notification to all registered Super Admins whenever a new user
 * interacts with the bot for the first time (e.g., /start), showing user details
 * and the updated total count of users using the bot.
 */
export async function notifySuperAdminNewUser({
  botToken,
  appUrl,
  newUser,
  totalUsers,
}: NotifySuperAdminParams): Promise<void> {
  try {
    const superAdminIds = await userRepository.getSuperAdminTelegramIds();
    if (!superAdminIds.length) {
      console.warn("[notifySuperAdmin] No superadmin IDs found to notify");
      return;
    }

    const fullName = [newUser.first_name, newUser.last_name].filter(Boolean).join(" ") || "User";
    const usernameTag = newUser.username ? `@${newUser.username}` : "No username";
    const tgIdStr = newUser.id.toString();

    const text =
      `🎉 <b>New Bot User Started! (አዲስ ተጠቃሚ)</b>\n\n` +
      `👤 <b>Name:</b> ${escapeHtml(fullName)}\n` +
      `🔗 <b>Username:</b> ${escapeHtml(usernameTag)}\n` +
      `🆔 <b>Telegram ID:</b> <code>${tgIdStr}</code>\n` +
      `🌍 <b>Language:</b> ${escapeHtml(newUser.language_code || "en")}\n\n` +
      `📊 <b>Total Bot Users:</b> <b>${totalUsers}</b> users\n\n` +
      `⚡ <i>TAF Fuel Finder System</i>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: `📊 Open Super Admin Portal (${totalUsers} Users)`,
            web_app: { url: `${appUrl}/admin` },
          },
        ],
      ],
    };

    await Promise.allSettled(
      superAdminIds.map(async (adminTgId) => {
        // Don't send "new user" notification to the superadmin about their own /start
        if (adminTgId.toString() === tgIdStr) return;

        return sendTelegramMessage(botToken, adminTgId.toString(), text, {
          parseMode: "HTML",
          replyMarkup,
        }).catch((err) => {
          console.warn(`[notifySuperAdmin] Failed to notify admin ${adminTgId}:`, err);
        });
      })
    );
  } catch (err) {
    console.error("[notifySuperAdmin] Unexpected error notifying superadmin:", err);
  }
}
