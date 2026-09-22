import { authContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { confirmSchema } from "@/lib/validation/station";
import { fuelStatusDeps } from "@/services/deps";
import { confirmAvailability } from "@/services/fuelStatusService";

/** "Still accurate ✓": refresh freshness without changing statuses. */
export const POST = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "BRANCH_ADMIN", "SUPER_ADMIN");
  const { stationId } = await parseBody(req, confirmSchema);
  return json(await confirmAvailability(fuelStatusDeps(), actor, stationId, ip));
});
