import { getDb } from "@/lib/db";
import { GUEST_STAFF_USER_ID } from "@/lib/api/context";
import type { Actor } from "@/lib/auth/rbac";

/**
 * Resolves a reporter name into a database User Actor.
 * If the actor is already authenticated (not the fallback guest), it is returned directly.
 * If anonymous but a reporter name/handle is supplied, looks up an existing user or creates one.
 */
export async function resolveReporterActor(
  reporterName: string | undefined,
  currentActor: Actor
): Promise<Actor> {
  // If already authenticated as an individual user, keep that user!
  if (currentActor.id !== GUEST_STAFF_USER_ID || !reporterName || !reporterName.trim()) {
    return currentActor;
  }

  const raw = reporterName.trim();
  const cleanUsername = raw.replace(/^@/, "").toLowerCase();
  const cleanDisplayName = raw.replace(/^@/, "");

  const db = getDb();

  // Try to find an existing user matching the username or first name
  let user = await db.user.findFirst({
    where: {
      OR: [
        { username: { equals: cleanUsername, mode: "insensitive" } },
        { firstName: { equals: cleanDisplayName, mode: "insensitive" } },
      ],
    },
    select: { id: true, role: true, stationAdmin: { select: { stationId: true } } },
  });

  if (!user) {
    // Generate a unique synthetic Telegram ID for the named web reporter (e.g. 700000000000 + random)
    const syntheticTgId = BigInt(Math.floor(700000000000 + Math.random() * 200000000000));
    try {
      user = await db.user.create({
        data: {
          telegramUserId: syntheticTgId,
          firstName: cleanDisplayName,
          username: raw.startsWith("@") ? cleanUsername : null,
          role: "OPERATIONS_ADMIN",
          isActive: true,
        },
        select: { id: true, role: true, stationAdmin: { select: { stationId: true } } },
      });
    } catch {
      // If concurrent insert conflict, fall back to currentActor
      return currentActor;
    }
  }

  return {
    id: user.id,
    role: "OPERATIONS_ADMIN",
    stationId: user.stationAdmin?.stationId ?? currentActor.stationId ?? null,
  };
}
