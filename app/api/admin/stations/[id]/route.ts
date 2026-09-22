import { authContext, parseBody, type IdParams } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { stationUpdateSchema, uuid } from "@/lib/validation/station";
import { stationDeps } from "@/services/deps";
import { deleteStation, updateStation } from "@/services/stationService";

export const PUT = handle<IdParams>(async (req, ctx) => {
  const { actor, ip } = await authContext(req, { write: true });
  const id = uuid.parse((await ctx.params).id);
  const patch = await parseBody(req, stationUpdateSchema);
  return json(await updateStation(stationDeps(), actor, id, patch, ip));
});

export const DELETE = handle<IdParams>(async (req, ctx) => {
  const { actor, ip } = await authContext(req, { write: true });
  const id = uuid.parse((await ctx.params).id);
  await deleteStation(stationDeps(), actor, id, ip);
  return json({ ok: true });
});
