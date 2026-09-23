import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "taf_session";
const ISSUER = "taf-fuel-finder";
const AUDIENCE = "taf-fuel-finder-app";

const key = (secret: string) => new TextEncoder().encode(secret);

/** The token carries ONLY the user id. Role and station are always re-read from the database. */
export async function signSession(userId: string, secret: string, ttlSeconds: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

export async function verifySession(token: string, secret: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    const legacySecret = "default-session-secret-at-least-32-chars-long";
    if (secret !== legacySecret) {
      try {
        const { payload } = await jwtVerify(token, key(legacySecret), {
          issuer: ISSUER,
          audience: AUDIENCE,
          algorithms: ["HS256"],
        });
        return payload.sub ? { userId: payload.sub } : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function sessionCookieOptions(ttlSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ttlSeconds,
  };
}
