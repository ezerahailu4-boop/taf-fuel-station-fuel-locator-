import { z } from "zod";
import { authContext, parseQuery } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { notificationRepository } from "@/repositories/notificationRepository";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = handle(async (req) => {
  const { user } = await authContext(req, { write: false });
  const { page, pageSize } = parseQuery(req, querySchema);
  const result = await notificationRepository.listInAppByUser(user.id, page, pageSize);
  return json(result);
});
