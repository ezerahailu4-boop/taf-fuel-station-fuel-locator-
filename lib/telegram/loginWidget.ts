import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Telegram Login Widget verification (for the web admin dashboard, outside Telegram).
 * https://core.telegram.org/widgets/login#checking-authorization
 *   secret_key = SHA256(bot_token)
 *   hash       = HMAC_SHA256(key = secret_key, data = data_check_string)
 */
export type LoginWidgetFailure = "bad_signature" | "expired" | "from_future" | "invalid_payload";

export class LoginWidgetError extends Error {
  constructor(public readonly reason: LoginWidgetFailure) {
    super(`Invalid Telegram login payload: ${reason}`);
    this.name = "LoginWidgetError";
  }
}

const payloadSchema = z.object({
  id: z.string().regex(/^\d{1,15}$/),
  first_name: z.string().min(1).max(256),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().max(1024).optional(),
  auth_date: z.string().regex(/^\d{1,12}$/),
  hash: z.string().regex(/^[0-9a-f]{64}$/i),
});

export interface LoginWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function verifyLoginWidget(
  payload: Record<string, string | number>,
  opts: { botToken: string; maxAgeSeconds?: number; now?: () => number },
): { user: LoginWidgetUser; authDate: Date } {
  // Normalise every value to a string exactly as Telegram signed it.
  const strPayload: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) strPayload[k] = String(v);

  const parsed = payloadSchema.safeParse(strPayload);
  if (!parsed.success) throw new LoginWidgetError("invalid_payload");

  const dataCheckString = Object.entries(strPayload)
    .filter(([k]) => k !== "hash")
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = createHash("sha256").update(opts.botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const given = Buffer.from(parsed.data.hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new LoginWidgetError("bad_signature");
  }

  const authDateSec = Number(parsed.data.auth_date);
  const nowSec = Math.floor((opts.now ?? Date.now)() / 1000);
  if (authDateSec - nowSec > 60) throw new LoginWidgetError("from_future");
  if (nowSec - authDateSec > (opts.maxAgeSeconds ?? 600)) throw new LoginWidgetError("expired");

  return {
    user: {
      id: Number(parsed.data.id),
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      username: parsed.data.username,
    },
    authDate: new Date(authDateSec * 1000),
  };
}
