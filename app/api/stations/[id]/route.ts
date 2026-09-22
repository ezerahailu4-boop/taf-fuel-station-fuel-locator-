import { handle, json } from "@/lib/api/handler";
import { PUBLIC_CACHE, publicContext, type IdParams } from "@/lib/api/context";
import { uuid } from "@/lib/validation/station";
import { stationDeps } from "@/services/deps";
import { getPublicStation } from "@/services/stationService";

export const GET = handle<IdParams>(async (req, ctx) => {
  publicContext(req);
  const id = uuid.parse((await ctx.params).id);
  return json(await getPublicStation(stationDeps(), id), { headers: PUBLIC_CACHE });
});
