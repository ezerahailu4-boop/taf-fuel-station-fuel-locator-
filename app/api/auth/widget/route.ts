import { z } from "zod";
import { cookieLoginResponse } from "@/lib/api/authResponse";
import { getClientIp, handle, readJson } from "@/lib/api/handler";
import { authLimiter, enforceRateLimit } from "@/lib/rate-limit";
import { getAuthDeps } from "@/services/authDeps";
import { loginWithWidget } from "@/services/authService";

const bodySchema = z.record(z.string().max(64), z.union([z.string().max(1024), z.number()]));

/** Web admin login via the Telegram Login Widget. Staff accounts only. */
export const POST = handle(async (req) => {
  enforceRateLimit(authLimiter, `widget:${getClientIp(req)}`);
  const payload = bodySchema.parse(await readJson(req));
  return cookieLoginResponse(await loginWithWidget(getAuthDeps(), payload));
});
