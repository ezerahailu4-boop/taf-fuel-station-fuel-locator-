import { z } from "zod";
import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json, readJson } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { activityRepository } from "@/repositories/activityRepository";
import type { Role } from "@/generated/prisma/client";

const updateRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "OPERATIONS_ADMIN", "BRANCH_ADMIN", "SUPER_ADMIN", "VIEWER"]),
  stationId: z.string().max(100).nullable().optional(),
});

export const PATCH = handle(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN");

  const { id } = await params;
  const db = getDb();

  const targetUser = await db.user.findUnique({
    where: { id },
    include: { stationAdmin: true },
  });

  if (!targetUser) {
    return json({ error: "User not found" }, { status: 404 });
  }

  const body = await readJson(req);
  const data = updateRoleSchema.parse(body);

  const oldRole = targetUser.role;
  const newRole = data.role as Role;

  // Handle station assignment if role is BRANCH_ADMIN
  if (newRole === "BRANCH_ADMIN") {
    if (!data.stationId) {
      return json({ error: "Station is required for Branch Staff role" }, { status: 400 });
    }
    await db.stationAdmin.upsert({
      where: { userId: targetUser.id },
      create: { userId: targetUser.id, stationId: data.stationId },
      update: { stationId: data.stationId },
    });
  } else {
    // If user is no longer branch admin, remove stationAdmin link
    if (targetUser.stationAdmin) {
      await db.stationAdmin.delete({ where: { userId: targetUser.id } }).catch(() => {});
    }
  }

  const updatedUser = await db.user.update({
    where: { id },
    data: { role: newRole },
    select: {
      id: true,
      telegramUserId: true,
      firstName: true,
      lastName: true,
      username: true,
      role: true,
      isActive: true,
    },
  });

  await activityRepository.log({
    actorUserId: actor.id,
    stationId: data.stationId ?? null,
    action: "USER_ROLE_CHANGED",
    entity: `user:${targetUser.id}`,
    oldValue: { role: oldRole },
    newValue: { role: newRole, stationId: data.stationId ?? null },
    ip,
  }).catch(() => {});

  return json({
    ok: true,
    user: {
      ...updatedUser,
      telegramUserId: updatedUser.telegramUserId.toString(),
    },
  });
});
