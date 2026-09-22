import { tooManyRequests } from "./api/errors";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

/**
 * Sliding-window limiter kept in memory.
 * NOTE: on serverless each instance has its own memory, so this is best-effort per instance.
 * The RateLimiter interface lets us swap in a shared store (e.g. Upstash Redis) later without touching callers.
 */
export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  const now = opts.now ?? Date.now;
  let lastSweep = now();

  return {
    check(key) {
      const t = now();
      const windowStart = t - opts.windowMs;

      if (t - lastSweep > opts.windowMs) {
        for (const [k, arr] of hits) {
          if (arr.every((ts) => ts <= windowStart)) hits.delete(k);
        }
        lastSweep = t;
      }

      const recent = (hits.get(key) ?? []).filter((ts) => ts > windowStart);
      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        const oldest = recent[0]!;
        return { ok: false, remaining: 0, retryAfterSeconds: (oldest + opts.windowMs - t) / 1000 };
      }
      recent.push(t);
      hits.set(key, recent);
      return { ok: true, remaining: opts.limit - recent.length, retryAfterSeconds: 0 };
    },
  };
}

export function enforceRateLimit(limiter: RateLimiter, key: string): void {
  const r = limiter.check(key);
  if (!r.ok) throw tooManyRequests(r.retryAfterSeconds);
}

// Shared limiter instances
export const authLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
export const otpRequestLimiter = createRateLimiter({ limit: 3, windowMs: 10 * 60_000 });
export const otpVerifyLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });
export const adminWriteLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
export const publicReadLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
