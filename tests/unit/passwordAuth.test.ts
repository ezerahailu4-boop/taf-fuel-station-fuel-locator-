import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/password/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "postgresql://mock:mock@localhost:5432/mock",
    SESSION_SECRET: "secret-for-testing-at-least-32-chars-long",
    SESSION_TTL_SECONDS: 43200,
    ADMIN_PASSWORD: "tafadmin2026",
  }),
}));

const mockSuperAdmin = {
  id: "u-super-1",
  telegramUserId: 2074368152n,
  firstName: "TAF",
  lastName: "Admin",
  username: "Ezrsh_404",
  preferredLocale: "en",
  role: "SUPER_ADMIN",
  isActive: true,
  stationAdmin: { stationId: "st-tolroad" },
};

vi.mock("@/lib/db", () => {
  return {
    getDb: () => ({
      user: {
        findUnique: vi.fn().mockResolvedValue(mockSuperAdmin),
        findFirst: vi.fn().mockResolvedValue(mockSuperAdmin),
        update: vi.fn().mockResolvedValue(mockSuperAdmin),
        create: vi.fn().mockResolvedValue(mockSuperAdmin),
      },
    }),
  };
});

describe("POST /api/auth/password", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "tafadmin2026";
    process.env.SESSION_SECRET = "secret-for-testing-at-least-32-chars-long";
  });

  it("returns 401 Unauthorized for incorrect password", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrongpassword" }),
    });

    const res = await POST(req, {} as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid admin password");
  });

  it("authenticates as SUPER_ADMIN with correct password and sets session cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "tafadmin2026" }),
    });

    const res = await POST(req, {} as any);
    expect(res.status).toBe(200);

    // Verify session cookie is set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("taf_session=");

    // Verify authenticated user
    const data = await res.json();
    expect(data.user.role).toBe("SUPER_ADMIN");
    expect(data.user.telegramUserId).toBe("2074368152");
    expect(data.user.firstName).toBe("TAF");
  });
});
