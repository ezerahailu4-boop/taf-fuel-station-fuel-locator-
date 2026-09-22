import { authContext, type IdParams } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";

export const DELETE = handle<IdParams>(async (req, { params }) => {
  const { user } = await authContext(req, { write: true });
  const { id } = await params;
  const removed = await subscriptionRepository.remove(user.id, id);
  return json({ success: removed });
});
