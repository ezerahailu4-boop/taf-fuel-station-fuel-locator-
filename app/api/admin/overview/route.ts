import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "VIEWER");
  const db = getDb();

  const [
    totalStations,
    activeStations,
    openStations,
    totalFuelTypes,
    activeFuelTypes,
    totalSubscribers,
    activeSubscriptions,
    deliveriesSent,
    deliveriesPending,
    deliveriesBlocked,
    recentActivity,
    stationSummaries,
  ] = await Promise.all([
    db.station.count(),
    db.station.count({ where: { isActive: true } }),
    db.station.count({ where: { status: "OPEN", isActive: true } }),
    db.fuelType.count(),
    db.fuelType.count({ where: { isActive: true } }),
    db.user.count({ where: { isActive: true } }),
    db.notificationSubscription.count({ where: { isActive: true } }),
    db.notificationDelivery.count({ where: { status: "SENT" } }),
    db.notificationDelivery.count({ where: { status: "PENDING" } }),
    db.notificationDelivery.count({ where: { status: "BLOCKED" } }),
    db.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { firstName: true, lastName: true, role: true } },
        station: { select: { branchName: true } },
      },
    }),
    db.station.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        fuelStatuses: {
          select: {
            status: true,
            fuelType: { select: { slug: true, nameEn: true, icon: true } },
          },
        },
        admins: {
          select: {
            user: { select: { id: true, firstName: true, lastName: true, telegramUserId: true } },
          },
        },
      },
    }),
  ]);

  return json({
    stats: {
      stations: { total: totalStations, active: activeStations, open: openStations },
      fuelTypes: { total: totalFuelTypes, active: activeFuelTypes },
      subscribers: { totalUsers: totalSubscribers, activeSubscriptions },
      notifications: { sent: deliveriesSent, pending: deliveriesPending, blocked: deliveriesBlocked },
    },
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      createdAt: a.createdAt.toISOString(),
      actorName: a.actor ? `${a.actor.firstName} ${a.actor.lastName || ""}`.trim() : "System",
      actorRole: a.actor?.role ?? null,
      branchName: a.station?.branchName ?? null,
      newValue: a.newValue,
      oldValue: a.oldValue,
    })),
    stations: stationSummaries.map((s) => ({
      id: s.id,
      name: s.name,
      branchName: s.branchName,
      city: s.city,
      area: s.area,
      address: s.address,
      phone: s.phone,
      latitude: s.latitude,
      longitude: s.longitude,
      status: s.status,
      isActive: s.isActive,
      admin: s.admins[0]?.user
        ? {
            id: s.admins[0].user.id,
            name: `${s.admins[0].user.firstName} ${s.admins[0].user.lastName || ""}`.trim(),
            telegramUserId: s.admins[0].user.telegramUserId.toString(),
          }
        : null,
      fuels: s.fuelStatuses.map((f) => ({
        slug: f.fuelType.slug,
        nameEn: f.fuelType.nameEn,
        icon: f.fuelType.icon,
        status: f.status,
      })),
    })),
  });
});
