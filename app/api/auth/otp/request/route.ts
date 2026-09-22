import { z } from "zod";
import { getClientIp, handle, json, readJson } from "@/lib/api/handler";
import { enforceRateLimit, otpRequestLimiter } from "@/lib/rate-limit";
import { getAuthDeps } from "@/services/authDeps";
import { requestLoginCode } from "@/services/authService";

const bodySchema = z.object({ telegramId: z.string().regex(/^\d{1,15}$/) });

/** Always answers { ok: true } so callers cannot discover which Telegram IDs are administrators. */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { telegramId } = bodySchema.parse(await readJson(req));
    enforceRateLimit(otpRequestLimiter, `ip:${ip}`);
    enforceRateLimit(otpRequestLimiter, `tg:${telegramId}`);
    await requestLoginCode(getAuthDeps(), BigInt(telegramId));
    return json({ ok: true });
  } catch (err: any) {
    console.error("[otp/request] error:", err);
    return json({ error: { code: "ERROR", message: err?.message || String(err) } }, { status: 500 });
  }
}
