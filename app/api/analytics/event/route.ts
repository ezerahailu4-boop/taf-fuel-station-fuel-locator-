import { parseBody, publicContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { analyticsEventSchema } from "@/lib/validation/station";
import { analyticsRepository } from "@/repositories/analyticsRepository";

/** Aggregate usage events (station views, app opens). No user identifiers, no location. */
export const POST = handle(async (req) => {
  publicContext(req);
  const e = await parseBody(req, analyticsEventSchema);
  await analyticsRepository.record(e).catch((err) => console.error("[analytics] failed", err instanceof Error ? err.message : err));
  return json({ ok: true }, { status: 202 });
});
