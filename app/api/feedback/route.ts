import { z } from "zod";
import { handle, json, readJson, getClientIp } from "@/lib/api/handler";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { feedbackRepository } from "@/repositories/feedbackRepository";
import { enforceRateLimit, publicWriteLimiter } from "@/lib/rate-limit";

const feedbackSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  contact: z.string().max(150).optional().nullable(),
  message: z.string().min(3, "Message must be at least 3 characters").max(3000, "Message is too long"),
  stationId: z.string().max(100).optional().nullable(),
});

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  enforceRateLimit(publicWriteLimiter, `feedback:${ip}`);

  const raw = await readJson(req);
  const data = feedbackSchema.parse(raw);

  // Attempt to link logged-in user if available, but allow anonymous guests
  const user = await getCurrentUser(req).catch(() => null);

  const cleanStationId = data.stationId && data.stationId.trim() ? data.stationId.trim() : null;

  const feedback = await feedbackRepository.create({
    userId: user?.id ?? null,
    name: data.name || (user ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}` : null),
    contact: data.contact || (user?.username ? `@${user.username}` : null),
    message: data.message,
    stationId: cleanStationId,
  });

  return json({ ok: true, id: feedback.id }, { status: 201 });
});
