import type { z } from "zod";
import { getClientIp, readJson } from "@/lib/api/handler";
import { toActor } from "@/lib/auth/actor";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { adminWriteLimiter, enforceRateLimit, publicReadLimiter } from "@/lib/rate-limit";

import type { Actor, Role } from "@/lib/auth/rbac";

export const DEFAULT_TOLLROAD_STATION_ID = "b0000000-0000-0000-0000-000000000001";
export const DEFAULT_TOLROAD_STATION_ID = DEFAULT_TOLLROAD_STATION_ID;
export const GUEST_STAFF_USER_ID = "c0000000-0000-0000-0000-000000000002";
export const DEFAULT_STAFF_USER_ID = GUEST_STAFF_USER_ID;

/** Authenticated staff/customer context. Writes are rate-limited per user. */
export async function authContext(req: Request, opts: { write: boolean }) {
  const user = await getCurrentUser(req);
  if (opts.write) enforceRateLimit(adminWriteLimiter, `user:${user.id}`);
  return { user, actor: toActor(user), ip: getClientIp(req) };
}

/**
 * Branch context: allows authenticated staff/admins/Telegram users OR guest branch staff.
 * If signed in, uses the authenticated user's real ID (elevating CUSTOMER to OPERATIONS_ADMIN
 * for station management) so that audit logs show the actual user's name.
 * If anonymous, provides the dedicated guest staff actor (never the Super Admin).
 */
export async function branchAuthContext(req: Request, opts: { write: boolean }) {
  const ip = getClientIp(req);
  try {
    const user = await getCurrentUser(req);
    if (opts.write) enforceRateLimit(adminWriteLimiter, `user:${user.id}`);
    const role: Role = user.role === "CUSTOMER" ? "OPERATIONS_ADMIN" : user.role;
    const actor: Actor = {
      id: user.id,
      role,
      stationId: user.stationId ?? null,
    };
    return { user, actor, ip };
  } catch {
    if (opts.write) enforceRateLimit(adminWriteLimiter, `branch-guest:${ip}`);
    const guestActor: Actor = {
      id: GUEST_STAFF_USER_ID,
      role: "OPERATIONS_ADMIN",
      stationId: DEFAULT_TOLROAD_STATION_ID,
    };
    return { user: null, actor: guestActor, ip };
  }
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
