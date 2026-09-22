import { handle, json } from "@/lib/api/handler";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { toPublicUser } from "@/types/auth";

export const GET = handle(async (req) => {
  const user = await getCurrentUser(req);
  return json({ user: toPublicUser(user) });
});
