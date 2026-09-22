import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { notificationRepository } from "@/repositories/notificationRepository";

export const POST = handle(async (req) => {
  const { user } = await authContext(req, { write: true });
  const count = await notificationRepository.markAllInAppRead(user.id);
  return json({ markedCount: count });
});
