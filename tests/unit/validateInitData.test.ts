import { describe, expect, it } from "vitest";
import { InitDataError, validateInitData } from "@/lib/telegram/validateInitData";
import { BOT_TOKEN, makeInitData, signInitData } from "../helpers/telegram";

const NOW = 1_800_000_000_000; // ms
const nowSec = NOW / 1000;
const opts = { botToken: BOT_TOKEN, now: () => NOW };

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof InitDataError) return e.reason;
    throw e;
  }
  return "no-error";
};

describe("validateInitData", () => {
  it("accepts correctly signed, fresh data and returns the user", () => {
    const r = validateInitData(makeInitData({ authDate: nowSec - 10, userId: 777 }), opts);
    expect(r.user.id).toBe(777);
    expect(r.user.first_name).toBe("Abebe");
    expect(r.user.language_code).toBe("am");
    expect(r.queryId).toBe("AAH-test");
  });

  it("rejects data signed with a different bot token", () => {
    const data = makeInitData({ authDate: nowSec - 10, botToken: "999:OTHER-BOT-TOKEN-zzzzzzzzzzzzzzzzzzzz" });
    expect(reasonOf(() => validateInitData(data, opts))).toBe("bad_signature");
  });

  it("rejects when the user payload is tampered with (privilege/identity swap)", () => {
    const good = new URLSearchParams(makeInitData({ authDate: nowSec - 10, userId: 1 }));
    good.set("user", JSON.stringify({ id: 999999, first_name: "Evil" }));
    expect(reasonOf(() => validateInitData(good.toString(), opts))).toBe("bad_signature");
  });

  it("rejects when an extra field is injected after signing", () => {
    const good = new URLSearchParams(makeInitData({ authDate: nowSec - 10 }));
    good.set("start_param", "admin");
    expect(reasonOf(() => validateInitData(good.toString(), opts))).toBe("bad_signature");
  });

  it("rejects a missing hash", () => {
    const p = new URLSearchParams(makeInitData({ authDate: nowSec - 10 }));
    p.delete("hash");
    expect(reasonOf(() => validateInitData(p.toString(), opts))).toBe("missing_hash");
  });

  it("rejects a non-hex / wrong-length hash without throwing unexpected errors", () => {
    const p = new URLSearchParams(makeInitData({ authDate: nowSec - 10 }));
    p.set("hash", "zzzz");
    expect(reasonOf(() => validateInitData(p.toString(), opts))).toBe("bad_signature");
  });

  it("rejects expired data (older than max age)", () => {
    const data = makeInitData({ authDate: nowSec - 90_000 });
    expect(reasonOf(() => validateInitData(data, { ...opts, maxAgeSeconds: 86_400 }))).toBe("expired");
  });

  it("honours a custom max age", () => {
    const data = makeInitData({ authDate: nowSec - 120 });
    expect(reasonOf(() => validateInitData(data, { ...opts, maxAgeSeconds: 60 }))).toBe("expired");
    expect(reasonOf(() => validateInitData(data, { ...opts, maxAgeSeconds: 600 }))).toBe("no-error");
  });

  it("rejects auth_date far in the future", () => {
    const data = makeInitData({ authDate: nowSec + 3600 });
    expect(reasonOf(() => validateInitData(data, opts))).toBe("from_future");
  });

  it("tolerates small clock skew", () => {
    const data = makeInitData({ authDate: nowSec + 30 });
    expect(reasonOf(() => validateInitData(data, opts))).toBe("no-error");
  });

  it("rejects a validly-signed payload with no user", () => {
    const data = signInitData({ auth_date: String(nowSec - 5), query_id: "x" });
    expect(reasonOf(() => validateInitData(data, opts))).toBe("missing_user");
  });

  it("rejects a validly-signed payload with malformed user JSON", () => {
    const data = signInitData({ auth_date: String(nowSec - 5), user: "{not json" });
    expect(reasonOf(() => validateInitData(data, opts))).toBe("invalid_user");
  });

  it("rejects a validly-signed user with an invalid shape", () => {
    const data = makeInitData({ authDate: nowSec - 5, user: { id: "abc", first_name: "" } });
    expect(reasonOf(() => validateInitData(data, opts))).toBe("invalid_user");
  });

  it("rejects empty, oversized and garbage input", () => {
    expect(reasonOf(() => validateInitData("", opts))).toBe("malformed");
    expect(reasonOf(() => validateInitData("x".repeat(9000), opts))).toBe("malformed");
    expect(reasonOf(() => validateInitData("not-initdata", opts))).toBe("missing_hash");
  });
});
