import { authContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { settingsRepository } from "@/repositories/settingsRepository";
import { activityRepository } from "@/repositories/activityRepository";
import { z } from "zod";

const settingsUpdateSchema = z.record(z.string(), z.unknown());

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "VIEWER");
  const settings = await (settingsRepository.getAll ? settingsRepository.getAll() : settingsRepository.getMany([
    "company_name",
    "logo_url",
    "default_radius_km",
    "stale_after_minutes",
    "auto_notify_enabled",
    "auto_notify_cooldown_minutes",
    "map_provider",
  ]));
  return json({ settings });
});

export const PUT = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "SUPER_ADMIN");
  const updates = await parseBody(req, settingsUpdateSchema);

  if (settingsRepository.setMany) {
    await settingsRepository.setMany(updates);
  }

  await activityRepository.log({
    actorUserId: actor.id,
    stationId: null,
    action: "SETTINGS_UPDATED",
    entity: "settings",
    newValue: updates,
    ip,
  });

  return json({ ok: true, settings: updates });
});
