import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

describe("passwords utility", () => {
  it("hashes password and verifies correctly", () => {
    const raw = "SecurePass123!";
    const hash = hashPassword(raw);
    expect(hash).toContain(":");
    expect(verifyPassword(raw, hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("produces distinct salts for identical passwords", () => {
    const p1 = hashPassword("samePassword");
    const p2 = hashPassword("samePassword");
    expect(p1).not.toBe(p2);
    expect(verifyPassword("samePassword", p1)).toBe(true);
    expect(verifyPassword("samePassword", p2)).toBe(true);
  });

  it("handles malformed hashes gracefully", () => {
    expect(verifyPassword("foo", "")).toBe(false);
    expect(verifyPassword("foo", "invalidhashformat")).toBe(false);
  });
});
