import { authContext, parseQuery } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { activityQuerySchema } from "@/lib/validation/station";
import { activityDeps } from "@/services/deps";
import { listActivity } from "@/services/activityService";

/** Full audit log (Super Admin / Viewer). Branch admins use /api/branch/activity. */
export const GET = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "VIEWER");
  const q = parseQuery(req, activityQuerySchema);
  return json(await listActivity(activityDeps(), actor, q, ip));
});
