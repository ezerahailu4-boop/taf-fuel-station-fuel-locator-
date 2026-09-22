import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "VIEWER");

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const role = (searchParams.get("role") || "").trim().toUpperCase();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: any = { isActive: true };

  if (role && ["CUSTOMER", "BRANCH_ADMIN", "SUPER_ADMIN", "VIEWER"].includes(role)) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
    // If search is numeric, check telegramUserId
    if (/^\d+$/.test(search)) {
      where.OR.push({ telegramUserId: BigInt(search) });
    }
  }

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        telegramUserId: true,
        firstName: true,
        lastName: true,
        username: true,
        languageCode: true,
        preferredLocale: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        stationAdmin: {
          select: {
            station: {
              select: {
                id: true,
                branchName: true,
              },
            },
          },
        },
        _count: {
          select: {
            subscriptions: { where: { isActive: true } },
          },
        },
      },
    }),
  ]);

  return json({
    total,
    users: users.map((u) => ({
      id: u.id,
      telegramUserId: u.telegramUserId.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      languageCode: u.languageCode,
      preferredLocale: u.preferredLocale,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      station: u.stationAdmin?.station?.branchName ?? null,
      activeAlerts: u._count.subscriptions,
    })),
  });
});
