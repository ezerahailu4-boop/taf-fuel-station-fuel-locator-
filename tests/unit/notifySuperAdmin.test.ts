import { describe, expect, it, vi, beforeEach } from "vitest";
import { notifySuperAdminNewUser } from "@/lib/telegram/notifyAdmin";
import { userRepository } from "@/repositories/userRepository";

// Mock fetch for Telegram Bot API
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/repositories/userRepository", () => ({
  userRepository: {
    getSuperAdminTelegramIds: vi.fn(),
  },
}));

describe("notifySuperAdminNewUser", () => {
  const BOT_TOKEN = "123456:MOCK_TOKEN";
  const APP_URL = "https://taf.example.com";

  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 101 } }),
      text: async () => JSON.stringify({ ok: true }),
    });
  });

  it("sends notification with user info and total count to all superadmins", async () => {
    vi.mocked(userRepository.getSuperAdminTelegramIds).mockResolvedValue([
      2074368152n,
      999999999n,
    ]);

    await notifySuperAdminNewUser({
      botToken: BOT_TOKEN,
      appUrl: APP_URL,
      newUser: {
        id: 12345678,
        first_name: "Dawit",
        last_name: "Tadesse",
        username: "dawit_t",
        language_code: "am",
      },
      totalUsers: 45,
    });

    // Should call sendMessage for both superadmins
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const call1 = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(call1.chat_id).toBe("2074368152");
    expect(call1.parse_mode).toBe("HTML");
    expect(call1.text).toContain("New Bot User Started!");
    expect(call1.text).toContain("Dawit Tadesse");
    expect(call1.text).toContain("@dawit_t");
    expect(call1.text).toContain("12345678");
    expect(call1.text).toContain("Total Bot Users:");
    expect(call1.text).toContain("45");
    expect(call1.reply_markup.inline_keyboard[0][0].web_app.url).toBe("https://taf.example.com/admin");

    const call2 = JSON.parse(mockFetch.mock.calls[1]![1].body);
    expect(call2.chat_id).toBe("999999999");
  });

  it("does not notify superadmin if the new user is the superadmin themselves", async () => {
    vi.mocked(userRepository.getSuperAdminTelegramIds).mockResolvedValue([
      2074368152n,
    ]);

    await notifySuperAdminNewUser({
      botToken: BOT_TOKEN,
      appUrl: APP_URL,
      newUser: {
        id: 2074368152, // Same as superadmin ID
        first_name: "Admin",
        username: "superadmin",
      },
      totalUsers: 1,
    });

    // Should skip notifying themselves
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
