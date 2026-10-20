import { branchAuthContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { resolveReporterActor } from "@/lib/api/reporter";
import { confirmSchema } from "@/lib/validation/station";
import { fuelStatusDeps } from "@/services/deps";
import { confirmAvailability } from "@/services/fuelStatusService";

/** "Still accurate ✓": refresh freshness without changing statuses. */
export const POST = handle(async (req) => {
  const { actor: baseActor, ip } = await branchAuthContext(req, { write: true });
  requireRole(baseActor, "BRANCH_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN");
  const input = await parseBody(req, confirmSchema);
  const actor = await resolveReporterActor(input.reporterName, baseActor);
  return json(await confirmAvailability(fuelStatusDeps(), actor, input.stationId, ip));
});
