import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import type { LoginResult } from "@/services/authService";

/** Web login: sets httpOnly cookie and returns token in JSON for seamless client authentication. */
export function cookieLoginResponse(result: LoginResult): NextResponse {
  const res = NextResponse.json(
    { user: result.user, token: result.token },
    { headers: { "Cache-Control": "no-store" } }
  );
  res.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresInSeconds));
  return res;
}
