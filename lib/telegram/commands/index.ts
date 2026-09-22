import type { TelegramUpdate } from "@/types/notifications";
import { answerCallbackQuery } from "../bot";
import { handleStartCommand } from "./start";
import { handleCheckCommand } from "./check";
import { handleStationsCommand } from "./stations";
import { handleNearestCommand, handleLocationReceived } from "./nearest";
import { handleNotificationsCommand } from "./notifications";
import { handleHelpCommand } from "./help";
import { handleAdminCommand } from "./admin";

export async function dispatchTelegramUpdate(
  update: TelegramUpdate,
  botToken: string,
  appUrl: string
): Promise<void> {
  // Handle callback query (inline button clicks)
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || "";

    if (cq.message) {
      if (data === "cmd_nearest") {
        await handleNearestCommand(cq.message, botToken, appUrl);
      } else if (data === "cmd_stations") {
        await handleStationsCommand(cq.message, botToken, appUrl);
      }
    }

    await answerCallbackQuery(botToken, cq.id);
    return;
  }

  // Handle regular messages
  const msg = update.message;
  if (!msg) return;

  // Handle location messages
  if (msg.location) {
    await handleLocationReceived(msg, msg.location, botToken, appUrl);
    return;
  }

  const text = (msg.text || "").trim();
  const command = (text.split(" ")[0] ?? "").toLowerCase().split("@")[0]; // handle /command@bot_name

  switch (command) {
    case "/start":
      await handleStartCommand(msg, botToken, appUrl);
      break;
    case "/check":
      await handleCheckCommand(msg, botToken, appUrl);
      break;
    case "/stations":
      await handleStationsCommand(msg, botToken, appUrl);
      break;
    case "/nearest":
      await handleNearestCommand(msg, botToken, appUrl);
      break;
    case "/notifications":
    case "/alerts":
      await handleNotificationsCommand(msg, botToken, appUrl);
      break;
    case "/admin":
      await handleAdminCommand(msg, botToken, appUrl);
      break;
    case "/help":
      await handleHelpCommand(msg, botToken, appUrl);
      break;
    default:
      // If it starts with a slash but is unrecognized:
      if (text.startsWith("/")) {
        await handleHelpCommand(msg, botToken, appUrl);
      }
      break;
  }
}
