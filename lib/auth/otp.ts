import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Keyed hash so a database leak does not reveal usable codes. Bound to the user. */
export function hashCode(code: string, userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${userId}:${code}`).digest("hex");
}

export function codeMatches(code: string, userId: string, secret: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(code, userId, secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
