import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { createRateLimiter, enforceRateLimit } from "@/lib/rate-limit";

describe("rate limiter", () => {
  it("allows up to the limit then blocks, per key", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect([1, 2, 3].map(() => rl.check("a").ok)).toEqual([true, true, true]);
    const blocked = rl.check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(rl.check("b").ok).toBe(true); // other keys unaffected
  });

  it("recovers after the window passes", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    t = 1001;
    expect(rl.check("a").ok).toBe(true);
  });

  it("enforceRateLimit throws a 429 with Retry-After", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 5000, now: () => 0 });
    enforceRateLimit(rl, "k");
    try {
      enforceRateLimit(rl, "k");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(429);
      expect((e as ApiError).headers?.["Retry-After"]).toBe("5");
    }
  });
});
