import { branchAuthContext, parseQuery } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { activityQuerySchema } from "@/lib/validation/station";
import { activityDeps } from "@/services/deps";
import { listActivity } from "@/services/activityService";

/** Activity history for the caller's station. */
export const GET = handle(async (req) => {
  const { actor, ip } = await branchAuthContext(req, { write: false });
  requireRole(actor, "BRANCH_ADMIN", "SUPER_ADMIN", "VIEWER");
  const q = parseQuery(req, activityQuerySchema);
  return json(await listActivity(activityDeps(), actor, q, ip));
});
