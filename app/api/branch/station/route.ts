import { z } from "zod";
import { authContext, parseQuery } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { uuid } from "@/lib/validation/station";
import { stationDeps } from "@/services/deps";
import { resolveStationId } from "@/services/fuelStatusService";
import { getStationForStaff } from "@/services/stationService";

/** The branch admin's own station (or ?stationId= for Super Admin/Viewer), including inactive ones. */
export const GET = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: false });
  requireRole(actor, "BRANCH_ADMIN", "SUPER_ADMIN", "VIEWER");
  const { stationId } = parseQuery(req, z.object({ stationId: uuid.optional() }));
  const station = await getStationForStaff(stationDeps(), actor, resolveStationId(actor, stationId), ip);
  return json({ station });
});
