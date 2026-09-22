import { authContext, parseBody, type IdParams } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { assignAdminSchema, uuid } from "@/lib/validation/station";
import { stationDeps } from "@/services/deps";
import { assignStationAdmin } from "@/services/stationService";

/** Assign a branch administrator (by Telegram user ID) to this station. Super Admin only. */
export const PUT = handle<IdParams>(async (req, ctx) => {
  const { actor, ip } = await authContext(req, { write: true });
  const id = uuid.parse((await ctx.params).id);
  const input = await parseBody(req, assignAdminSchema);
  return json(await assignStationAdmin(stationDeps(), actor, id, input, ip));
});
