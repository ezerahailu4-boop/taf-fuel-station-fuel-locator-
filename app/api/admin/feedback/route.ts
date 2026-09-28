import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";
import { feedbackRepository } from "@/repositories/feedbackRepository";
import type { FeedbackStatus } from "@/generated/prisma/client";

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN", "VIEWER", "BRANCH_ADMIN");

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || "all";
  const stationIdParam = searchParams.get("stationId") || undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  // If BRANCH_ADMIN, restrict to their assigned station
  const stationId = actor.role === "BRANCH_ADMIN" ? actor.stationId : stationIdParam;

  const result = await feedbackRepository.list({
    status: statusParam === "all" ? "all" : (statusParam as FeedbackStatus),
    stationId: stationId || undefined,
    limit,
    offset,
  });

  return json(result);
});
