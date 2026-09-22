import { NextResponse, type NextRequest } from "next/server";
import { processStaleStationReminders } from "@/services/staleReminderService";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const cronHeader = req.headers.get("x-vercel-cron");
  return !!cronHeader;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processStaleStationReminders();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/stale-reminders] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
