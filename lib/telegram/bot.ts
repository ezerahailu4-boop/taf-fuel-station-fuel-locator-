import type {
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
} from "@/types/notifications";

export class TelegramBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramBlockedError";
  }
}

export class TelegramRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number = 5) {
    super(message);
    this.name = "TelegramRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface SendMessageOptions {
  parseMode?: "HTML" | "MarkdownV2";
  replyMarkup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup;
  disableWebPagePreview?: boolean;
}

/** Telegram Bot API client (fetch-based). */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  opts: SendMessageOptions = {}
): Promise<{ ok: boolean; messageId?: number }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: opts.parseMode,
      reply_markup: opts.replyMarkup,
      disable_web_page_preview: opts.disableWebPagePreview ?? true,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let desc = raw.slice(0, 250);
    let retryAfter = 5;
    try {
      const parsed = JSON.parse(raw);
      desc = parsed.description || desc;
      if (parsed.parameters?.retry_after) {
        retryAfter = parsed.parameters.retry_after;
      }
    } catch {}

    // Check if user blocked the bot or chat was not found / deactivated
    const lower = desc.toLowerCase();
    if (
      res.status === 403 ||
      lower.includes("bot was blocked by the user") ||
      lower.includes("user is deactivated") ||
      lower.includes("chat not found")
    ) {
      throw new TelegramBlockedError(desc);
    }

    if (res.status === 429) {
      throw new TelegramRateLimitError(desc, retryAfter);
    }

    throw new Error(`Telegram sendMessage failed (${res.status}): ${desc}`);
  }

  const data = await res.json().catch(() => ({}));
  return { ok: true, messageId: data.result?.message_id };
}

export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    console.warn(`[telegram] answerCallbackQuery failed: ${raw.slice(0, 100)}`);
  }
}

export async function setTelegramWebhook(
  botToken: string,
  url: string,
  secretToken: string
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = await res.json().catch(() => ({ ok: false }));
  return data;
}

export async function setBotCommands(
  botToken: string,
  commands: Array<{ command: string; description: string }>,
  languageCode?: string
): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands,
      language_code: languageCode,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  return !!data.ok;
}
