import type { z } from "zod";
import { getClientIp, readJson } from "@/lib/api/handler";
import { toActor } from "@/lib/auth/actor";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { adminWriteLimiter, enforceRateLimit, publicReadLimiter } from "@/lib/rate-limit";

/** Authenticated staff/customer context. Writes are rate-limited per user. */
export async function authContext(req: Request, opts: { write: boolean }) {
  const user = await getCurrentUser(req);
  if (opts.write) enforceRateLimit(adminWriteLimiter, `user:${user.id}`);
  return { user, actor: toActor(user), ip: getClientIp(req) };
}

export function publicContext(req: Request) {
  const ip = getClientIp(req);
  enforceRateLimit(publicReadLimiter, `read:${ip}`);
  return { ip };
}

export function parseQuery<T extends z.ZodType>(req: Request, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  return schema.parse(await readJson(req));
}

/** Short shared-cache window for read-heavy public data. Real-time pushes (Phase 3) cover freshness. */
export const PUBLIC_CACHE = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" };

export type IdParams = { params: Promise<{ id: string }> };
