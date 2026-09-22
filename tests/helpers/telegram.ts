import { createHash, createHmac } from "node:crypto";

export const BOT_TOKEN = "123456:TEST-TOKEN-abcdefghijklmnopqrstuvwxyz";

/** Builds initData exactly the way Telegram does. */
export function signInitData(
  fields: Record<string, string>,
  botToken = BOT_TOKEN,
): string {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

export function makeInitData(opts: {
  userId?: number;
  authDate: number;
  botToken?: string;
  extra?: Record<string, string>;
  user?: unknown;
}): string {
  const user = opts.user ?? { id: opts.userId ?? 42, first_name: "Abebe", username: "abebe", language_code: "am" };
  return signInitData(
    { auth_date: String(opts.authDate), query_id: "AAH-test", user: JSON.stringify(user), ...(opts.extra ?? {}) },
    opts.botToken,
  );
}

export function signWidget(fields: Record<string, string>, botToken = BOT_TOKEN): Record<string, string> {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return { ...fields, hash };
}
