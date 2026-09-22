import { parseBody, publicContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { nearbyBodySchema } from "@/lib/validation/station";
import { nearbyDeps } from "@/services/deps";
import { findNearby } from "@/services/nearbyService";

/**
 * POST /api/stations/nearby   { lat, lng, radiusKm?, fuel?, openOnly?, limit? }
 * POST (not GET) on purpose: coordinates must not end up in URLs, which CDNs and hosting logs record.
 * The response is never cached.
 */
export const POST = handle(async (req) => {
  publicContext(req);
  const body = await parseBody(req, nearbyBodySchema);
  return json(await findNearby(nearbyDeps(), body));
});
