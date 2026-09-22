import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { verifySession } from "@/lib/auth/session";
import {
  loginWithInitData,
  loginWithWidget,
  requestLoginCode,
  verifyLoginCode,
  type AuthDeps,
} from "@/services/authService";
import { BOT_TOKEN, makeInitData, signWidget } from "../helpers/telegram";
import { FakeLoginCodeRepo, FakeUserRepo, makeUser } from "../helpers/fakes";

const SECRET = "test-session-secret-at-least-32-characters-long!!";
const NOW = new Date("2026-09-21T09:00:00Z");
const nowSec = Math.floor(NOW.getTime() / 1000);

function setup(users = [makeUser({ id: "cust", telegramUserId: 42n })]) {
  const sent: Array<{ chatId: number; text: string }> = [];
  const deps: AuthDeps = {
    users: new FakeUserRepo(users),
    codes: new FakeLoginCodeRepo(),
    botToken: BOT_TOKEN,
    sessionSecret: SECRET,
    sessionTtlSeconds: 3600,
    initDataMaxAgeSeconds: 86_400,
    sendMessage: async (chatId, text) => {
      sent.push({ chatId, text });
    },
    now: () => NOW,
  };
  return { deps, sent };
}

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e.status;
    throw e;
  }
  return 200;
};

describe("loginWithInitData (Mini App)", () => {
  it("creates a customer on first login and returns a verifiable session", async () => {
    const { deps } = setup([]);
    const res = await loginWithInitData(deps, makeInitData({ authDate: nowSec - 5, userId: 9001 }));
    expect(res.user.telegramUserId).toBe("9001");
    expect(res.user.role).toBe("CUSTOMER");
    expect(res.user.preferredLocale).toBe("am"); // from language_code "am"
    const session = await verifySession(res.token, SECRET);
    expect(session?.userId).toBe(res.user.id);
  });

  it("never lets a client-supplied role leak into the session (token holds only the user id)", async () => {
    const { deps } = setup([]);
    const initData = makeInitData({
      authDate: nowSec - 5,
      user: { id: 5, first_name: "Mallory", role: "SUPER_ADMIN" },
    });
    const res = await loginWithInitData(deps, initData);
    expect(res.user.role).toBe("CUSTOMER");
  });

  it("rejects forged initData with 401", async () => {
    const { deps } = setup();
    const forged = makeInitData({ authDate: nowSec - 5, botToken: "1:ATTACKER-BOT-TOKEN-xxxxxxxxxxxxxxxxxxxx" });
    expect(await status(loginWithInitData(deps, forged))).toBe(401);
  });

  it("rejects expired initData with 401", async () => {
    const { deps } = setup();
    expect(await status(loginWithInitData(deps, makeInitData({ authDate: nowSec - 200_000 })))).toBe(401);
  });

  it("blocks deactivated accounts with 403", async () => {
    const { deps } = setup([makeUser({ id: "x", telegramUserId: 42n, isActive: false })]);
    expect(await status(loginWithInitData(deps, makeInitData({ authDate: nowSec - 5, userId: 42 })))).toBe(403);
  });
});

describe("loginWithWidget (web admin)", () => {
  const widget = (id: string) => signWidget({ id, first_name: "Sara", auth_date: String(nowSec - 5) });

  it("logs in an active branch admin", async () => {
    const { deps } = setup([makeUser({ id: "ba", telegramUserId: 555n, role: "BRANCH_ADMIN", stationId: "st1" })]);
    const res = await loginWithWidget(deps, widget("555"));
    expect(res.user.role).toBe("BRANCH_ADMIN");
    expect(res.user.stationId).toBe("st1");
  });

  it("refuses customers and unknown users (403)", async () => {
    const { deps } = setup([makeUser({ id: "c", telegramUserId: 555n, role: "CUSTOMER" })]);
    expect(await status(loginWithWidget(deps, widget("555")))).toBe(403);
    expect(await status(loginWithWidget(deps, widget("123456")))).toBe(403);
  });

  it("refuses a forged widget payload (401)", async () => {
    const { deps } = setup([makeUser({ id: "ba", telegramUserId: 555n, role: "SUPER_ADMIN" })]);
    const forged = { ...widget("555"), id: "555", hash: "0".repeat(64) };
    expect(await status(loginWithWidget(deps, forged))).toBe(401);
  });
});

describe("one-time login codes", () => {
  const staff = () => makeUser({ id: "sa", telegramUserId: 111n, role: "SUPER_ADMIN" });
  const lastCode = (sent: Array<{ text: string }>) => /(\d{6})/.exec(sent.at(-1)!.text)![1]!;

  it("sends a 6-digit code to staff and logs in with it exactly once", async () => {
    const { deps, sent } = setup([staff()]);
    await requestLoginCode(deps, 111n);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.chatId).toBe(111);
    const code = lastCode(sent);

    const res = await verifyLoginCode(deps, 111n, code);
    expect(res.user.role).toBe("SUPER_ADMIN");
    expect(await status(verifyLoginCode(deps, 111n, code))).toBe(401); // single use
  });

  it("does NOT send codes to customers or unknown IDs, and resolves identically (no enumeration)", async () => {
    const { deps, sent } = setup([makeUser({ id: "c", telegramUserId: 42n })]);
    await expect(requestLoginCode(deps, 42n)).resolves.toBeUndefined();
    await expect(requestLoginCode(deps, 999n)).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it("rejects a wrong code, and locks the code after 5 wrong attempts even if the right one follows", async () => {
    const { deps, sent } = setup([staff()]);
    await requestLoginCode(deps, 111n);
    const good = lastCode(sent);
    const wrong = good === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) expect(await status(verifyLoginCode(deps, 111n, wrong))).toBe(401);
    expect(await status(verifyLoginCode(deps, 111n, good))).toBe(401);
  });

  it("requesting a new code invalidates the previous one", async () => {
    const { deps, sent } = setup([staff()]);
    await requestLoginCode(deps, 111n);
    const first = lastCode(sent);
    await requestLoginCode(deps, 111n);
    const second = lastCode(sent);
    if (first !== second) expect(await status(verifyLoginCode(deps, 111n, first))).toBe(401);
    expect((await verifyLoginCode(deps, 111n, second)).user.id).toBe("sa");
  });

  it("rejects an expired code", async () => {
    const { deps, sent } = setup([staff()]);
    await requestLoginCode(deps, 111n);
    const code = lastCode(sent);
    const later = { ...deps, now: () => new Date(NOW.getTime() + 11 * 60_000) };
    expect(await status(verifyLoginCode(later, 111n, code))).toBe(401);
  });

  it("does not store the plaintext code", async () => {
    const { deps, sent } = setup([staff()]);
    await requestLoginCode(deps, 111n);
    const code = lastCode(sent);
    const rows = (deps.codes as FakeLoginCodeRepo).rows;
    expect(rows[0]!.codeHash).not.toContain(code);
    expect(rows[0]!.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
