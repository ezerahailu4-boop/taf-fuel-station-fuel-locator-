import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "VIEWER");
  const db = getDb();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalEvents,
    events24h,
    events7d,
    eventsByType,
    fuelEvents,
    stationViews,
    fuelTypes,
    stations,
  ] = await Promise.all([
    db.analyticsEvent.count(),
    db.analyticsEvent.count({ where: { createdAt: { gte: dayAgo } } }),
    db.analyticsEvent.count({ where: { createdAt: { gte: weekAgo } } }),
    db.analyticsEvent.groupBy({
      by: ["event"],
      _count: { event: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["fuelTypeId"],
      where: { fuelTypeId: { not: null } },
      _count: { fuelTypeId: true },
      orderBy: { _count: { fuelTypeId: "desc" } },
      take: 10,
    }),
    db.analyticsEvent.groupBy({
      by: ["stationId"],
      where: { stationId: { not: null } },
      _count: { stationId: true },
      orderBy: { _count: { stationId: "desc" } },
      take: 10,
    }),
    db.fuelType.findMany({ select: { id: true, nameEn: true, slug: true, icon: true } }),
    db.station.findMany({ select: { id: true, branchName: true, name: true } }),
  ]);

  const fuelMap = new Map(fuelTypes.map((f) => [f.id, f]));
  const stationMap = new Map(stations.map((s) => [s.id, s]));

  const eventCounts = Object.fromEntries(
    eventsByType.map((e) => [e.event, e._count.event])
  );

  const topFuels = fuelEvents.map((f) => ({
    fuelTypeId: f.fuelTypeId,
    name: fuelMap.get(f.fuelTypeId!)?.nameEn ?? "Unknown",
    slug: fuelMap.get(f.fuelTypeId!)?.slug ?? "unknown",
    icon: fuelMap.get(f.fuelTypeId!)?.icon ?? "⛽",
    count: f._count.fuelTypeId,
  }));

  const topStations = stationViews.map((s) => ({
    stationId: s.stationId,
    branchName: stationMap.get(s.stationId!)?.branchName ?? "Station",
    name: stationMap.get(s.stationId!)?.name ?? "TAF Fuel Station",
    count: s._count.stationId,
  }));

  return json({
    summary: {
      total: totalEvents,
      last24h: events24h,
      last7d: events7d,
    },
    byType: {
      station_view: eventCounts.station_view ?? 0,
      nearby_search: eventCounts.nearby_search ?? 0,
      fuel_search: eventCounts.fuel_search ?? 0,
      app_open: eventCounts.app_open ?? 0,
    },
    topFuels,
    topStations,
  });
});
