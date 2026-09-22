import { authContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { availabilityUpdateSchema } from "@/lib/validation/station";
import { fuelStatusDeps } from "@/services/deps";
import { saveAvailability } from "@/services/fuelStatusService";

/**
 * PUT /api/branch/availability
 * Body: { stationId?, stationStatus?, fuels: [{ fuelTypeId, status, note? }] }
 * Branch admins are locked to their own station; Super Admins must pass stationId.
 */
export const PUT = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  requireRole(actor, "BRANCH_ADMIN", "SUPER_ADMIN");
  const input = await parseBody(req, availabilityUpdateSchema);
  const { changed, plan } = await saveAvailability(fuelStatusDeps(), actor, input, ip);
  return json({ changed, fuelChanges: plan.fuelChanges, stationStatusChange: plan.stationStatusChange });
});
