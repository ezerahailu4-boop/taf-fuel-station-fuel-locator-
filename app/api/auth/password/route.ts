import { z } from "zod";
import { getEnv } from "@/lib/env";
import { getDb } from "@/lib/db";
import { cookieLoginResponse } from "@/lib/api/authResponse";
import { getClientIp, handle, readJson } from "@/lib/api/handler";
import { signSession } from "@/lib/auth/session";
import { enforceRateLimit, otpVerifyLimiter } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/auth/passwords";
import type { PublicUser } from "@/types/auth";

const bodySchema = z.object({
  username: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  enforceRateLimit(otpVerifyLimiter, `ip:${ip}`);

  const data = bodySchema.parse(await readJson(req));
  const rawUsername = data.username?.trim();
  const db = getDb();

  let user: any = null;

  if (rawUsername && rawUsername.toLowerCase() !== "admin" && rawUsername.toLowerCase() !== "superadmin") {
    // Staff / Operations Admin login with username & custom password
    user = await db.user.findFirst({
      where: {
        username: { equals: rawUsername.replace(/^@/, ""), mode: "insensitive" },
        isActive: true,
      },
      include: { stationAdmin: { select: { stationId: true } } },
    });

    if (!user || !user.passwordHash || !verifyPassword(data.password, user.passwordHash)) {
      return new Response(JSON.stringify({ error: "Invalid username or password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  } else {
    // Super Admin master password login
    const expectedPassword = process.env.ADMIN_PASSWORD || "tafadmin2026";

    if (data.password !== expectedPassword) {
      return new Response(JSON.stringify({ error: "Invalid admin password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const superAdminTgId = BigInt(
      process.env.SUPER_ADMIN_TELEGRAM_ID ||
        process.env.SEED_SUPER_ADMIN_TELEGRAM_ID ||
        "2074368152"
    );

    user = await db.user.findUnique({
      where: { telegramUserId: superAdminTgId },
      include: { stationAdmin: { select: { stationId: true } } },
    });

    if (!user) {
      user = await db.user.findFirst({
        where: { role: "SUPER_ADMIN", isActive: true },
        include: { stationAdmin: { select: { stationId: true } } },
      });
    }

    if (!user) {
      user = await db.user.create({
        data: {
          telegramUserId: superAdminTgId,
          firstName: "TAF",
          lastName: "Admin",
          username: "Ezrsh_404",
          role: "SUPER_ADMIN",
          isActive: true,
          preferredLocale: "en",
          lastLoginAt: new Date(),
        },
        include: { stationAdmin: { select: { stationId: true } } },
      });
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }
  }

  const env = getEnv();
  const secret = env.SESSION_SECRET;
  const ttlSeconds = env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7; // default 7 days session
  const token = await signSession(user.id, secret, ttlSeconds);

  const publicUser: PublicUser = {
    id: user.id,
    telegramUserId: user.telegramUserId.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    preferredLocale: user.preferredLocale,
    role: user.role,
    stationId: user.stationAdmin?.stationId ?? null,
  };

  return cookieLoginResponse({
    token,
    expiresInSeconds: ttlSeconds,
    user: publicUser,
  });
});
