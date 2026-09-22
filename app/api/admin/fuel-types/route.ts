import { authContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { fuelTypeCreateSchema } from "@/lib/validation/station";
import { fuelTypeDeps } from "@/services/deps";
import { createFuelType } from "@/services/fuelTypeService";

export const POST = handle(async (req) => {
  const { actor, ip } = await authContext(req, { write: true });
  const input = await parseBody(req, fuelTypeCreateSchema);
  return json(await createFuelType(fuelTypeDeps(), actor, input, ip), { status: 201 });
});
