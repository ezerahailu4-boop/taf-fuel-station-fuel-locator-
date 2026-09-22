import { z } from "zod";
import { authContext, parseBody } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { uuid } from "@/lib/validation/station";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";

const subscribeSchema = z.object({
  stationId: uuid,
  fuelTypeId: uuid,
});

export const GET = handle(async (req) => {
  const { user } = await authContext(req, { write: false });
  const subscriptions = await subscriptionRepository.listByUser(user.id);
  return json({ subscriptions });
});

export const POST = handle(async (req) => {
  const { user } = await authContext(req, { write: true });
  const body = await parseBody(req, subscribeSchema);
  const subscription = await subscriptionRepository.upsert({
    userId: user.id,
    stationId: body.stationId,
    fuelTypeId: body.fuelTypeId,
  });
  return json({ subscription }, { status: 201 });
});
