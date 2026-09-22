import { handle, json } from "@/lib/api/handler";
import { PUBLIC_CACHE, parseQuery, publicContext } from "@/lib/api/context";
import { stationListQuerySchema } from "@/lib/validation/station";
import { stationDeps } from "@/services/deps";
import { listPublicStations } from "@/services/stationService";

/** GET /api/stations?q=&city=&area=&status=&page=&pageSize= (active stations with fuel availability) */
export const GET = handle(async (req) => {
  publicContext(req);
  const query = parseQuery(req, stationListQuerySchema);
  return json(await listPublicStations(stationDeps(), query), { headers: PUBLIC_CACHE });
});
