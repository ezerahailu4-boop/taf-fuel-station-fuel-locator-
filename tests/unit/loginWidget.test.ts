import { describe, expect, it } from "vitest";
import { LoginWidgetError, verifyLoginWidget } from "@/lib/telegram/loginWidget";
import { BOT_TOKEN, signWidget } from "../helpers/telegram";

const NOW = 1_800_000_000_000;
const nowSec = NOW / 1000;
const opts = { botToken: BOT_TOKEN, now: () => NOW };

const reasonOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof LoginWidgetError) return e.reason;
    throw e;
  }
  return "no-error";
};

const base = () => ({ id: "555", first_name: "Sara", username: "sara", auth_date: String(nowSec - 5) });

describe("verifyLoginWidget", () => {
  it("accepts a correctly signed payload", () => {
    const r = verifyLoginWidget(signWidget(base()), opts);
    expect(r.user.id).toBe(555);
    expect(r.user.username).toBe("sara");
  });

  it("accepts numeric values as JSON clients may send them", () => {
    const signed = signWidget(base());
    const numeric = { ...signed, id: Number(signed.id), auth_date: Number(signed.auth_date) };
    expect(verifyLoginWidget(numeric, opts).user.id).toBe(555);
  });

  it("rejects a tampered id", () => {
    const signed = signWidget(base());
    expect(reasonOf(() => verifyLoginWidget({ ...signed, id: "1" }, opts))).toBe("bad_signature");
  });

  it("rejects the wrong bot token", () => {
    const signed = signWidget(base(), "1:OTHER-TOKEN-xxxxxxxxxxxxxxxxxxxxxxxxxxx");
    expect(reasonOf(() => verifyLoginWidget(signed, opts))).toBe("bad_signature");
  });

  it("rejects stale logins (older than 10 minutes by default)", () => {
    const signed = signWidget({ ...base(), auth_date: String(nowSec - 3600) });
    expect(reasonOf(() => verifyLoginWidget(signed, opts))).toBe("expired");
  });

  it("rejects future-dated logins", () => {
    const signed = signWidget({ ...base(), auth_date: String(nowSec + 3600) });
    expect(reasonOf(() => verifyLoginWidget(signed, opts))).toBe("from_future");
  });

  it("rejects malformed payloads", () => {
    expect(reasonOf(() => verifyLoginWidget({ id: "abc", hash: "x" }, opts))).toBe("invalid_payload");
  });
});
