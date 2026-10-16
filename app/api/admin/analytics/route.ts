import { getDb } from "@/lib/db";
import { authContext } from "@/lib/api/context";
import { handle, json } from "@/lib/api/handler";
import { requireRole } from "@/lib/auth/rbac";

export const GET = handle(async (req) => {
  const { actor } = await authContext(req, { write: false });
  requireRole(actor, "SUPER_ADMIN", "OPERATIONS_ADMIN", "VIEWER");
  const db = getDb();

  const url = new URL(req.url);
  const rawPeriod = url.searchParams.get("period");
  const period: "day" | "week" | "month" =
    rawPeriod === "day" || rawPeriod === "month" ? rawPeriod : "week";

  const now = new Date();
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [
    totalAllTimeEvents,
    eventsInPeriod,
    eventsByType,
    fuelEvents,
    stationViews,
    fuelTypes,
    stations,
    historyRows,
  ] = await Promise.all([
    db.analyticsEvent.count().catch(() => 0),
    db.analyticsEvent.count({ where: { createdAt: { gte: fromDate } } }).catch(() => 0),
    db.analyticsEvent
      .groupBy({
        by: ["event"],
        where: { createdAt: { gte: fromDate } },
        _count: { event: true },
      })
      .catch(() => []),
    db.analyticsEvent
      .groupBy({
        by: ["fuelTypeId"],
        where: { fuelTypeId: { not: null }, createdAt: { gte: fromDate } },
        _count: { fuelTypeId: true },
        orderBy: { _count: { fuelTypeId: "desc" } },
        take: 10,
      })
      .catch(() => []),
    db.analyticsEvent
      .groupBy({
        by: ["stationId"],
        where: { stationId: { not: null }, createdAt: { gte: fromDate } },
        _count: { stationId: true },
        orderBy: { _count: { stationId: "desc" } },
        take: 10,
      })
      .catch(() => []),
    db.fuelType.findMany({ select: { id: true, nameEn: true, nameAm: true, slug: true, icon: true } }).catch(() => []),
    db.station
      .findMany({
        where: { isActive: true },
        orderBy: [{ city: "asc" }, { branchName: "asc" }],
        include: {
          fuelStatuses: {
            select: {
              status: true,
              liters: true,
              lastUpdated: true,
              fuelType: { select: { slug: true, nameEn: true, icon: true } },
            },
          },
          admins: {
            select: {
              user: {
                select: { id: true, firstName: true, lastName: true, telegramUserId: true, username: true, phone: true },
              },
            },
          },
        },
      })
      .catch(() => []),
    db.stationFuelStatusHistory?.findMany
      ? db.stationFuelStatusHistory
          .findMany({
            where: { changedAt: { gte: fromDate } },
            orderBy: { changedAt: "desc" },
            take: 100,
            include: {
              station: { select: { branchName: true, city: true } },
              fuelType: { select: { nameEn: true, slug: true, icon: true } },
              changedBy: { select: { firstName: true, lastName: true, role: true } },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const fuelMap = new Map(fuelTypes.map((f) => [f.id, f]));
  const stationMap = new Map(stations.map((s) => [s.id, s]));

  const eventCounts = Object.fromEntries(
    eventsByType.map((e) => [e.event, e._count.event])
  );

  let totalBenzineLiters = 0;
  let totalDieselLiters = 0;
  let totalFuelSlots = 0;
  let availableFuelSlots = 0;

  // Station status table with reliability calculations
  const stationsStatus = stations.map((s) => {
    const benzine = s.fuelStatuses.find((f) => f.fuelType.slug === "benzine");
    const diesel = s.fuelStatuses.find((f) => f.fuelType.slug === "diesel");

    if (typeof benzine?.liters === "number") totalBenzineLiters += benzine.liters;
    if (typeof diesel?.liters === "number") totalDieselLiters += diesel.liters;

    s.fuelStatuses.forEach((f) => {
      totalFuelSlots++;
      if (f.status === "AVAILABLE" || f.status === "LIMITED") {
        availableFuelSlots++;
      }
    });

    const stationHistory = historyRows.filter((h) => h.stationId === s.id);
    const outageCount = stationHistory.filter((h) => h.newStatus === "OUT_OF_STOCK").length;

    // Calculate approximate uptime rate for this station in period
    const totalTransitions = stationHistory.length;
    const uptimeRate = totalTransitions === 0 
      ? (s.status === "OPEN" && (benzine?.status === "AVAILABLE" || diesel?.status === "AVAILABLE") ? 100 : 0)
      : Math.round(((totalTransitions - outageCount) / Math.max(totalTransitions, 1)) * 100);

    const admin = s.admins[0]?.user;

    return {
      id: s.id,
      name: s.name,
      branchName: s.branchName,
      city: s.city,
      area: s.area,
      address: s.address,
      phone: s.phone,
      status: s.status,
      managerName: admin ? `${admin.firstName} ${admin.lastName || ""}`.trim() : null,
      managerTelegram: admin?.username ? `@${admin.username}` : admin?.telegramUserId ? admin.telegramUserId.toString() : null,
      managerPhone: admin?.phone || null,
      benzine: benzine
        ? {
            status: benzine.status,
            liters: typeof benzine.liters === "number" ? benzine.liters : null,
            lastUpdated: benzine.lastUpdated ? new Date(benzine.lastUpdated).toISOString() : null,
          }
        : null,
      diesel: diesel
        ? {
            status: diesel.status,
            liters: typeof diesel.liters === "number" ? diesel.liters : null,
            lastUpdated: diesel.lastUpdated ? new Date(diesel.lastUpdated).toISOString() : null,
          }
        : null,
      uptimeRate: Math.max(0, Math.min(100, uptimeRate)),
      outageCount,
    };
  });

  const networkAvailabilityRate = totalFuelSlots > 0 
    ? Math.round((availableFuelSlots / totalFuelSlots) * 100) 
    : 100;

  // Timeline buckets: generate sequential intervals (hours for "day", days for "week"/"month")
  const bucketCount = period === "day" ? 24 : period === "week" ? 7 : 30;
  const bucketDurationMs = (days * 24 * 60 * 60 * 1000) / bucketCount;

  const timeline = Array.from({ length: bucketCount }).map((_, i) => {
    const bucketStart = new Date(fromDate.getTime() + i * bucketDurationMs);
    const bucketEnd = new Date(fromDate.getTime() + (i + 1) * bucketDurationMs);

    let label = "";
    if (period === "day") {
      label = bucketStart.toLocaleTimeString([], { hour: "numeric", hour12: true });
    } else if (period === "week") {
      label = bucketStart.toLocaleDateString([], { weekday: "short", month: "numeric", day: "numeric" });
    } else {
      label = bucketStart.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    const eventsInBucket = historyRows.filter((h) => {
      const t = new Date(h.changedAt).getTime();
      return t >= bucketStart.getTime() && t < bucketEnd.getTime();
    });

    const avail = eventsInBucket.filter((h) => h.newStatus === "AVAILABLE").length;
    const limited = eventsInBucket.filter((h) => h.newStatus === "LIMITED").length;
    const oos = eventsInBucket.filter((h) => h.newStatus === "OUT_OF_STOCK").length;

    return {
      timestamp: bucketStart.toISOString(),
      label,
      available: avail,
      limited,
      outOfStock: oos,
      totalChanges: eventsInBucket.length,
    };
  });

  const statusHistory = historyRows.map((h) => ({
    id: h.id,
    changedAt: new Date(h.changedAt).toISOString(),
    stationId: h.stationId,
    branchName: h.station?.branchName ?? "Station",
    fuelName: h.fuelType?.nameEn ?? "Fuel",
    fuelSlug: h.fuelType?.slug ?? "fuel",
    oldStatus: h.oldStatus,
    newStatus: h.newStatus,
    oldLiters: typeof h.oldLiters === "number" ? h.oldLiters : null,
    newLiters: typeof h.newLiters === "number" ? h.newLiters : null,
    actorName: h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName || ""}`.trim() : "Branch Staff",
  }));

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
    period,
    range: {
      from: fromDate.toISOString(),
      to: now.toISOString(),
    },
    summary: {
      total: totalAllTimeEvents,
      totalAllTimeEvents,
      eventsInPeriod,
      activeStations: stations.length,
      totalBenzineLiters,
      totalDieselLiters,
      networkAvailabilityRate,
      statusTransitionsCount: historyRows.length,
    },
    byType: {
      station_view: eventCounts.station_view ?? 0,
      nearby_search: eventCounts.nearby_search ?? 0,
      fuel_search: eventCounts.fuel_search ?? 0,
      app_open: eventCounts.app_open ?? 0,
    },
    timeline,
    stationsStatus,
    statusHistory,
    topFuels,
    topStations,
  });
});
