import { z } from "zod";
import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json, readJson } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { activityRepository } from "@/repositories/activityRepository";

const createOpsAdminSchema = z.object({
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().regex(/^\d{1,15}$/).optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  username: z.string().max(100).optional(),
}).refine((data) => data.userId || data.telegramUserId, {
  message: "Either userId or telegramUserId must be provided",
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
      data: { role: "OPERATIONS_ADMIN", isActive: true },
    });

    await activityRepository.log({
      actorUserId: actor.id,
      stationId: null,
      action: "USER_ROLE_CHANGED",
      entity: `user:${targetUser.id}`,
      oldValue: { role: oldRole },
      newValue: { role: "OPERATIONS_ADMIN" },
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
          username: data.username ?? existing.username,
        },
      });

      await activityRepository.log({
        actorUserId: actor.id,
        stationId: null,
        action: "USER_ROLE_CHANGED",
        entity: `user:${targetUser.id}`,
        oldValue: { role: oldRole },
        newValue: { role: "OPERATIONS_ADMIN" },
        ip,
      }).catch(() => {});
    } else {
      targetUser = await db.user.create({
        data: {
          telegramUserId: tgId,
          firstName: data.firstName || "Operations Admin",
          lastName: data.lastName ?? null,
          username: data.username ?? null,
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
        newValue: { role: "OPERATIONS_ADMIN", telegramUserId: data.telegramUserId },
        ip,
      }).catch(() => {});
    }
  }

  if (!targetUser) {
    return json({ error: "Could not create or update user" }, { status: 400 });
  }

  return json({
    ok: true,
    user: {
      id: targetUser.id,
      telegramUserId: targetUser.telegramUserId.toString(),
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      username: targetUser.username,
      role: targetUser.role,
      isActive: targetUser.isActive,
      createdAt: targetUser.createdAt.toISOString(),
      lastLoginAt: targetUser.lastLoginAt ? targetUser.lastLoginAt.toISOString() : null,
    },
  });
});
