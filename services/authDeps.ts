import { getEnv } from "@/lib/env";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { loginCodeRepository } from "@/repositories/loginCodeRepository";
import { userRepository } from "@/repositories/userRepository";
import type { AuthDeps } from "./authService";

export function getAuthDeps(): AuthDeps {
  const env = getEnv();
  return {
    users: userRepository,
    codes: loginCodeRepository,
    botToken: env.TELEGRAM_BOT_TOKEN,
    sessionSecret: env.SESSION_SECRET,
    sessionTtlSeconds: env.SESSION_TTL_SECONDS,
    initDataMaxAgeSeconds: env.INIT_DATA_MAX_AGE_SECONDS,
    sendMessage: async (chatId, text) => {
      await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, text);
    },
  };
}
