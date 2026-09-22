import { authContext, type IdParams } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { notificationRepository } from "@/repositories/notificationRepository";

export const POST = handle<IdParams>(async (req, { params }) => {
  const { user } = await authContext(req, { write: true });
  const { id } = await params;
  const marked = await notificationRepository.markInAppRead(user.id, id);
  return json({ success: marked });
});
