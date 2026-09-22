import { z } from "zod";
import { cookieLoginResponse } from "@/lib/api/authResponse";
import { getClientIp, handle, readJson } from "@/lib/api/handler";
import { enforceRateLimit, otpVerifyLimiter } from "@/lib/rate-limit";
import { getAuthDeps } from "@/services/authDeps";
import { verifyLoginCode } from "@/services/authService";

const bodySchema = z.object({
  telegramId: z.string().regex(/^\d{1,15}$/),
  code: z.string().regex(/^\d{6}$/),
});

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const { telegramId, code } = bodySchema.parse(await readJson(req));
  enforceRateLimit(otpVerifyLimiter, `ip:${ip}`);
  enforceRateLimit(otpVerifyLimiter, `tg:${telegramId}`);
  return cookieLoginResponse(await verifyLoginCode(getAuthDeps(), BigInt(telegramId), code));
});
