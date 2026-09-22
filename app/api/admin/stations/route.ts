import { authContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { stationCreateSchema } from "@/lib/validation/station";
import { stationDeps } from "@/services/deps";
import { createStation } from "@/services/stationService";

export const POST = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  const input = await parseBody(req, stationCreateSchema);
  return json(await createStation(stationDeps(), actor, input, ip), { status: 201 });
});
