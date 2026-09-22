import { forbidden, unauthorized } from "@/lib/api/errors";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import type { AuthUser, UserRepo } from "@/types/auth";

export interface GuardDeps {
  users: UserRepo;
  sessionSecret: string;
  /** Allowed origin for cookie-authenticated state-changing requests, e.g. https://app.example.com */
  appUrl: string;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** CSRF defence for cookie sessions: state-changing requests must come from our own origin. */
export function assertSameOrigin(req: Request, appUrl: string): void {
  const origin = req.headers.get("origin");
  if (!origin) throw forbidden("Missing Origin header");
  let allowed: string;
  try {
    allowed = new URL(appUrl).origin;
  } catch {
    throw forbidden("Server origin is misconfigured");
  }
  if (origin !== allowed) throw forbidden("Cross-origin request blocked");
}

/**
 * Resolves the caller from a Bearer token (Mini App) or the session cookie (web admin).
 * The user, role and station are ALWAYS re-loaded from the database, so revoking a role or
 * deactivating an account takes effect immediately, and nothing role-related is trusted from the client.
 */
export async function authenticate(req: Request, deps: GuardDeps): Promise<AuthUser> {
  const authz = req.headers.get("authorization");
  let token: string | null = null;
  let viaCookie = false;

  if (authz?.toLowerCase().startsWith("bearer ")) {
    token = authz.slice(7).trim();
  } else {
    token = readCookie(req.headers.get("cookie"), SESSION_COOKIE);
    viaCookie = token !== null;
  }
  if (!token) throw unauthorized();

  if (viaCookie && !SAFE_METHODS.has(req.method.toUpperCase())) {
    assertSameOrigin(req, deps.appUrl);
  }

  const session = await verifySession(token, deps.sessionSecret);
  if (!session) throw unauthorized("Session expired. Please sign in again.");

  const user = await deps.users.findById(session.userId);
  if (!user) throw unauthorized();
  if (!user.isActive) throw forbidden("This account has been disabled");
  return user;
}
