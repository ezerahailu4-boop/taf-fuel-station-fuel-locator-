import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { authenticate, type GuardDeps } from "@/lib/auth/guards";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { FakeUserRepo, makeUser } from "../helpers/fakes";

const SECRET = "test-session-secret-at-least-32-characters-long!!";
const APP = "https://taf.example.com";

const mk = (users = [makeUser({ id: "u1", role: "BRANCH_ADMIN", stationId: "st-bole" })]): GuardDeps => ({
  users: new FakeUserRepo(users),
  sessionSecret: SECRET,
  appUrl: APP,
});

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
  return 200;
};

describe("authenticate", () => {
  it("accepts a valid Bearer token and loads role/station from the DB", async () => {
    const token = await signSession("u1", SECRET, 600);
    const user = await authenticate(
      new Request(`${APP}/api/x`, { headers: { authorization: `Bearer ${token}` } }),
      mk(),
    );
    expect(user.role).toBe("BRANCH_ADMIN");
    expect(user.stationId).toBe("st-bole");
  });

  it("reflects role changes immediately (token is not the source of truth)", async () => {
    const deps = mk();
    const token = await signSession("u1", SECRET, 600);
    (deps.users as FakeUserRepo).users.get("u1")!.role = "CUSTOMER";
    const user = await authenticate(new Request(APP, { headers: { authorization: `Bearer ${token}` } }), deps);
    expect(user.role).toBe("CUSTOMER");
  });

  it("rejects missing, garbage, wrong-secret and expired tokens with 401", async () => {
    expect(await status(authenticate(new Request(APP), mk()))).toBe(401);
    expect(await status(authenticate(new Request(APP, { headers: { authorization: "Bearer nope" } }), mk()))).toBe(401);
    const wrong = await signSession("u1", "another-secret-that-is-also-32-chars-long!!", 600);
    expect(await status(authenticate(new Request(APP, { headers: { authorization: `Bearer ${wrong}` } }), mk()))).toBe(401);
    const expired = await signSession("u1", SECRET, -10);
    expect(await status(authenticate(new Request(APP, { headers: { authorization: `Bearer ${expired}` } }), mk()))).toBe(401);
  });

  it("rejects tokens for unknown users (401) and disabled users (403)", async () => {
    const ghost = await signSession("ghost", SECRET, 600);
    expect(await status(authenticate(new Request(APP, { headers: { authorization: `Bearer ${ghost}` } }), mk()))).toBe(401);
    const off = await signSession("u1", SECRET, 600);
    const deps = mk([makeUser({ id: "u1", isActive: false })]);
    expect(await status(authenticate(new Request(APP, { headers: { authorization: `Bearer ${off}` } }), deps))).toBe(403);
  });

  describe("cookie sessions (web admin) and CSRF", () => {
    const cookieReq = async (method: string, origin?: string) => {
      const token = await signSession("u1", SECRET, 600);
      const headers: Record<string, string> = { cookie: `${SESSION_COOKIE}=${token}` };
      if (origin) headers.origin = origin;
      return new Request(`${APP}/api/x`, { method, headers });
    };

    it("allows GET without an Origin header", async () => {
      expect(await status(authenticate(await cookieReq("GET"), mk()))).toBe(200);
    });
    it("allows POST from the app origin", async () => {
      expect(await status(authenticate(await cookieReq("POST", APP), mk()))).toBe(200);
    });
    it("blocks POST from another origin or with no Origin (403)", async () => {
      expect(await status(authenticate(await cookieReq("POST", "https://evil.example"), mk()))).toBe(403);
      expect(await status(authenticate(await cookieReq("POST"), mk()))).toBe(403);
    });
    it("does not apply the Origin check to Bearer tokens (not ambient credentials)", async () => {
      const token = await signSession("u1", SECRET, 600);
      const req = new Request(`${APP}/api/x`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
      expect(await status(authenticate(req, mk()))).toBe(200);
    });
  });
});
