import { z } from "zod";
import { authContext } from "@/lib/api/context";
import { handle, json, readJson } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { feedbackRepository } from "@/repositories/feedbackRepository";
import { activityRepository } from "@/repositories/activityRepository";
import type { FeedbackStatus } from "@/generated/prisma/client";

const patchSchema = z.object({
  status: z.enum(["NEW", "RESOLVED"]).optional(),
  adminNotes: z.string().max(2000).nullable().optional(),
});

export const PATCH = handle(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN", "BRANCH_ADMIN");

  const { id } = await params;
  const existing = await feedbackRepository.getById(id);
  if (!existing) {
    return json({ error: "Feedback not found" }, { status: 404 });
  }

  // Branch admins can only update feedback for their own station
  if (actor.role === "BRANCH_ADMIN" && existing.stationId !== actor.stationId) {
    return json({ error: "Access denied" }, { status: 403 });
  }

  const body = await readJson(req);
  const data = patchSchema.parse(body);

  const updated = await feedbackRepository.update(id, {
    status: data.status as FeedbackStatus | undefined,
    adminNotes: data.adminNotes,
  });

  await activityRepository.log({
    actorUserId: actor.id,
    stationId: existing.stationId,
    action: "FEEDBACK_UPDATED",
    entity: `feedback:${id}`,
    oldValue: { status: existing.status, adminNotes: existing.adminNotes },
    newValue: { status: updated.status, adminNotes: updated.adminNotes },
    ip,
  }).catch(() => {});

  return json({ ok: true, item: updated });
});

export const DELETE = handle(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN");

  const { id } = await params;
  const existing = await feedbackRepository.getById(id);
  if (!existing) {
    return json({ error: "Feedback not found" }, { status: 404 });
  }

  await feedbackRepository.delete(id);

  await activityRepository.log({
    actorUserId: actor.id,
    stationId: existing.stationId,
    action: "FEEDBACK_DELETED",
    entity: `feedback:${id}`,
    oldValue: { message: existing.message, name: existing.name },
    ip,
  }).catch(() => {});

  return json({ ok: true });
});
