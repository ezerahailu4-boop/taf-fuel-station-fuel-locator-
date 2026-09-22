import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const POST = handle(async () => {
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
