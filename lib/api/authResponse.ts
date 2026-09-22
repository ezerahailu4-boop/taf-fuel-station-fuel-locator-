import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import type { LoginResult } from "@/services/authService";

/** Web login: token goes in an httpOnly cookie ONLY (never exposed to page JavaScript). */
export function cookieLoginResponse(result: LoginResult): NextResponse {
  const res = NextResponse.json({ user: result.user }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresInSeconds));
  return res;
}
