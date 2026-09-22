import { z } from "zod";
import { getClientIp, handle, json, readJson } from "@/lib/api/handler";
import { authLimiter, enforceRateLimit } from "@/lib/rate-limit";
import { getAuthDeps } from "@/services/authDeps";
import { loginWithInitData } from "@/services/authService";

const bodySchema = z.object({ initData: z.string().min(1).max(8192) });

/** Mini App login: the client sends raw `Telegram.WebApp.initData`; we validate the signature server-side. */
export const POST = handle(async (req) => {
  enforceRateLimit(authLimiter, `initdata:${getClientIp(req)}`);
  const { initData } = bodySchema.parse(await readJson(req));
  const { token, user, expiresInSeconds } = await loginWithInitData(getAuthDeps(), initData);
  return json({ token, user, expiresInSeconds });
});
