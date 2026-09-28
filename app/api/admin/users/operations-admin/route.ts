import { z } from "zod";
import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json, readJson } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { activityRepository } from "@/repositories/activityRepository";
import { hashPassword } from "@/lib/auth/passwords";

const createOpsAdminSchema = z.object({
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().regex(/^\d{1,15}$/).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  username: z.string().min(2).max(100).optional(),
  password: z.string().min(4, "Password must be at least 4 characters").optional(),
}).refine((data) => data.userId || data.telegramUserId || data.username, {
  message: "Either userId, username, or telegramUserId must be provided",
});

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN");

  const db = getDb();
  const admins = await db.user.findMany({
    where: { role: "OPERATIONS_ADMIN", isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      telegramUserId: true,
      firstName: true,
      lastName: true,
      username: true,
      passwordHash: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return json({
    admins: admins.map((u) => ({
      id: u.id,
      telegramUserId: u.telegramUserId.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      hasPassword: Boolean(u.passwordHash),
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    })),
  });
});

export const POST = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN");

  const db = getDb();
  const body = await readJson(req);
  const data = createOpsAdminSchema.parse(body);

  const cleanUsername = data.username ? data.username.trim().replace(/^@/, "").toLowerCase() : null;

  // If username provided, check for collision
  if (cleanUsername) {
    const existingUsername = await db.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: "insensitive" },
        ...(data.userId ? { id: { not: data.userId } } : {}),
      },
    });
    if (existingUsername) {
      return json({ error: `Username '${cleanUsername}' is already taken by another user.` }, { status: 400 });
    }
  }

  const passwordHash = data.password ? hashPassword(data.password) : undefined;
  let targetUser;

  if (data.userId) {
    targetUser = await db.user.findUnique({
      where: { id: data.userId },
    });
    if (!targetUser) {
      return json({ error: "User not found" }, { status: 404 });
    }

    const oldRole = targetUser.role;
    targetUser = await db.user.update({
      where: { id: targetUser.id },
      data: {
        role: "OPERATIONS_ADMIN",
        isActive: true,
        ...(cleanUsername ? { username: cleanUsername } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    await activityRepository.log({
      actorUserId: actor.id,
      stationId: null,
      action: "USER_ROLE_CHANGED",
      entity: `user:${targetUser.id}`,
      oldValue: { role: oldRole },
      newValue: { role: "OPERATIONS_ADMIN", username: cleanUsername },
      ip,
    }).catch(() => {});
  } else if (data.telegramUserId) {
    const tgId = BigInt(data.telegramUserId);
    const existing = await db.user.findUnique({
      where: { telegramUserId: tgId },
    });

    if (existing) {
      const oldRole = existing.role;
      targetUser = await db.user.update({
        where: { id: existing.id },
        data: {
          role: "OPERATIONS_ADMIN",
          isActive: true,
          firstName: data.firstName || existing.firstName,
          lastName: data.lastName ?? existing.lastName,
          username: cleanUsername ?? existing.username,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      await activityRepository.log({
        actorUserId: actor.id,
        stationId: null,
        action: "USER_ROLE_CHANGED",
        entity: `user:${targetUser.id}`,
        oldValue: { role: oldRole },
        newValue: { role: "OPERATIONS_ADMIN", username: cleanUsername },
        ip,
      }).catch(() => {});
    } else {
      targetUser = await db.user.create({
        data: {
          telegramUserId: tgId,
          firstName: data.firstName || (cleanUsername ? cleanUsername : "Operations Admin"),
          lastName: data.lastName ?? null,
          username: cleanUsername ?? null,
          passwordHash: passwordHash ?? null,
          role: "OPERATIONS_ADMIN",
          isActive: true,
        },
      });

      await activityRepository.log({
        actorUserId: actor.id,
        stationId: null,
        action: "USER_CREATED",
        entity: `user:${targetUser.id}`,
        oldValue: null,
        newValue: { role: "OPERATIONS_ADMIN", username: cleanUsername, telegramUserId: data.telegramUserId },
        ip,
      }).catch(() => {});
    }
  } else if (cleanUsername) {
    // Created by username & password directly without a Telegram account yet
    // Generate a unique synthetic negative or high-range BigInt for telegramUserId
    const syntheticTgId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

    targetUser = await db.user.create({
      data: {
        telegramUserId: syntheticTgId,
        firstName: data.firstName || cleanUsername,
        lastName: data.lastName ?? null,
        username: cleanUsername,
        passwordHash: passwordHash ?? null,
        role: "OPERATIONS_ADMIN",
        isActive: true,
      },
    });

    await activityRepository.log({
      actorUserId: actor.id,
      stationId: null,
      action: "USER_CREATED",
      entity: `user:${targetUser.id}`,
      oldValue: null,
      newValue: { role: "OPERATIONS_ADMIN", username: cleanUsername },
      ip,
    }).catch(() => {});
  }

  if (!targetUser) {
    return json({ error: "Could not create or update Operations Admin" }, { status: 400 });
  }

  return json({
    ok: true,
    user: {
      id: targetUser.id,
      telegramUserId: targetUser.telegramUserId.toString(),
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      username: targetUser.username,
      hasPassword: Boolean(targetUser.passwordHash),
      role: targetUser.role,
      isActive: targetUser.isActive,
      createdAt: targetUser.createdAt.toISOString(),
      lastLoginAt: targetUser.lastLoginAt ? targetUser.lastLoginAt.toISOString() : null,
    },
  });
});

export const PATCH = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN");

  const db = getDb();
  const body = await readJson(req);
  const data = resetPasswordSchema.parse(body);

  const targetUser = await db.user.findUnique({
    where: { id: data.userId },
  });

  if (!targetUser) {
    return json({ error: "User not found" }, { status: 404 });
  }

  const passwordHash = hashPassword(data.password);
  await db.user.update({
    where: { id: targetUser.id },
    data: { passwordHash },
  });

  await activityRepository.log({
    actorUserId: actor.id,
    stationId: null,
    action: "USER_PASSWORD_RESET",
    entity: `user:${targetUser.id}`,
    oldValue: null,
    newValue: { username: targetUser.username },
    ip,
  }).catch(() => {});

  return json({ ok: true, message: "Password updated successfully" });
});
