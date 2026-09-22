import { z } from "zod";
import { handle, json } from "@/lib/api/handler";
import { PUBLIC_CACHE, authContext, parseQuery, publicContext } from "@/lib/api/context";
import { requireRole } from "@/lib/auth/rbac";
import { fuelTypeDeps } from "@/services/deps";
import { listFuelTypes } from "@/services/fuelTypeService";

const querySchema = z.object({ all: z.enum(["1", "true"]).optional() });

/** Public: active fuel types. `?all=1` (Super Admin only) also returns disabled ones. */
export const GET = handle(async (req) => {
  const { all } = parseQuery(req, querySchema);
  if (all) {
    const { actor } = await authContext(req, { write: false });
    requireRole(actor, "SUPER_ADMIN", "VIEWER");
    return json({ items: await listFuelTypes(fuelTypeDeps(), true) });
  }
  publicContext(req);
  return json({ items: await listFuelTypes(fuelTypeDeps(), false) }, { headers: PUBLIC_CACHE });
});
