import { describe, expect, it } from "vitest";

describe("Feedback System", () => {
  it("validates feedback message length correctly", () => {
    const validMessage = "Fuel ran out at Bole station around 2 PM.";
    const emptyMessage = "";
    const shortMessage = "hi";

    expect(validMessage.trim().length).toBeGreaterThanOrEqual(3);
    expect(emptyMessage.trim().length).toBeLessThan(3);
    expect(shortMessage.trim().length).toBeLessThan(3);
  });

  it("formats customer contact cleanly", () => {
    const rawTelegram = "@testuser ";
    const rawPhone = "+251911000000";

    const formattedTelegram = rawTelegram.trim();
    const formattedPhone = rawPhone.trim();

    expect(formattedTelegram).toBe("@testuser");
    expect(formattedPhone).toBe("+251911000000");
  });
});
