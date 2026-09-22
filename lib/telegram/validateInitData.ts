import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1).max(256),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  language_code: z.string().max(16).optional(),
  is_bot: z.boolean().optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

export type InitDataFailure =
  | "malformed"
  | "missing_hash"
  | "bad_signature"
  | "missing_auth_date"
  | "expired"
  | "from_future"
  | "missing_user"
  | "invalid_user";

export class InitDataError extends Error {
  constructor(public readonly reason: InitDataFailure) {
    super(`Invalid Telegram initData: ${reason}`);
    this.name = "InitDataError";
  }
}

export interface ValidateInitDataOptions {
  botToken: string;
  /** Reject data older than this many seconds. Default 24h. */
  maxAgeSeconds?: number;
  /** Injectable clock (ms since epoch) for tests. */
  now?: () => number;
}

export interface ValidatedInitData {
  user: TelegramUser;
  authDate: Date;
  queryId?: string;
  startParam?: string;
}

const HEX64 = /^[0-9a-f]{64}$/i;
const CLOCK_SKEW_SECONDS = 60;

function safeEqualHex(a: string, b: string): boolean {
  if (!HEX64.test(a) || !HEX64.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Validates Telegram Mini App `initData` on the SERVER.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *   secret_key = HMAC_SHA256(key = "WebAppData", data = bot_token)
 *   hash       = HMAC_SHA256(key = secret_key, data = data_check_string)
 * data_check_string = all received fields except `hash`, sorted alphabetically, as "key=value" joined by "\n".
 */
export function validateInitData(initData: string, opts: ValidateInitDataOptions): ValidatedInitData {
  if (typeof initData !== "string" || initData.length === 0 || initData.length > 8192) {
    throw new InitDataError("malformed");
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    throw new InitDataError("malformed");
  }

  const hash = params.get("hash");
  if (!hash) throw new InitDataError("missing_hash");

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(opts.botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!safeEqualHex(expected, hash)) throw new InitDataError("bad_signature");

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw || !/^\d{1,12}$/.test(authDateRaw)) throw new InitDataError("missing_auth_date");
  const authDateSec = Number(authDateRaw);
  const nowSec = Math.floor((opts.now ?? Date.now)() / 1000);
  const maxAge = opts.maxAgeSeconds ?? 86_400;

  if (authDateSec - nowSec > CLOCK_SKEW_SECONDS) throw new InitDataError("from_future");
  if (nowSec - authDateSec > maxAge) throw new InitDataError("expired");

  const userRaw = params.get("user");
  if (!userRaw) throw new InitDataError("missing_user");
  let userJson: unknown;
  try {
    userJson = JSON.parse(userRaw);
  } catch {
    throw new InitDataError("invalid_user");
  }
  const parsed = telegramUserSchema.safeParse(userJson);
  if (!parsed.success) throw new InitDataError("invalid_user");

  return {
    user: parsed.data,
    authDate: new Date(authDateSec * 1000),
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
  };
}
