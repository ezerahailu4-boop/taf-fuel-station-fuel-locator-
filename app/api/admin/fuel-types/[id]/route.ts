import { authContext, parseBody, type IdParams } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { fuelTypeUpdateSchema, uuid } from "@/lib/validation/station";
import { fuelTypeDeps } from "@/services/deps";
import { updateFuelType } from "@/services/fuelTypeService";

export const PUT = handle<IdParams>(async (req, ctx) => {
  const { actor, ip } = await authContext(req, { write: true });
  const id = uuid.parse((await ctx.params).id);
  const patch = await parseBody(req, fuelTypeUpdateSchema);
  return json(await updateFuelType(fuelTypeDeps(), actor, id, patch, ip));
});
