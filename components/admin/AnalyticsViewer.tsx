"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/client/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartIcon,
  GasStationIcon,
  TagIcon,
  SearchIcon,
  SparklesIcon,
  RefreshIcon,
  DownloadIcon,
  CalendarIcon,
  PrinterIcon,
  FilterIcon,
  CopyIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  PhoneIcon,
  SendIcon,
} from "@/components/ui/icons";

export type AnalyticsPeriod = "day" | "week" | "month";

export interface StationFuelStatusInfo {
  status: "AVAILABLE" | "LIMITED" | "OUT_OF_STOCK" | string;
  liters: number | null;
  lastUpdated: string | null;
}

export interface StationStatusItem {
  id: string;
  name: string;
  branchName: string;
  city: string;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  status: string;
  managerName: string | null;
  managerTelegram: string | null;
  managerPhone: string | null;
  benzine: StationFuelStatusInfo | null;
  diesel: StationFuelStatusInfo | null;
  uptimeRate: number; // 0 - 100
  outageCount: number;
}

export interface TimelineBucket {
  timestamp: string;
  label: string;
  available: number;
  limited: number;
  outOfStock: number;
  totalChanges: number;
}

export interface StatusHistoryItem {
  id: string;
  changedAt: string;
  stationId: string;
  branchName: string;
  fuelName: string;
  fuelSlug: string;
  oldStatus: string;
  newStatus: string;
  oldLiters: number | null;
  newLiters: number | null;
  actorName: string;
}

export interface AnalyticsData {
  period: AnalyticsPeriod;
  range: {
    from: string;
    to: string;
  };
  summary: {
    totalAllTimeEvents: number;
    eventsInPeriod: number;
    activeStations: number;
    totalBenzineLiters: number;
    totalDieselLiters: number;
    networkAvailabilityRate: number;
    statusTransitionsCount: number;
  };
  byType: {
    station_view: number;
    nearby_search: number;
    fuel_search: number;
    app_open: number;
  };
  timeline: TimelineBucket[];
  stationsStatus: StationStatusItem[];
  statusHistory: StatusHistoryItem[];
  topFuels: Array<{ fuelTypeId: string; name: string; slug: string; icon: string; count: number }>;
  topStations: Array<{ stationId: string; branchName: string; name: string; count: number }>;
}

export function AnalyticsViewer() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "LIMITED" | "OUT_OF_STOCK">("ALL");
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [hoveredBucket, setHoveredBucket] = useState<TimelineBucket | null>(null);

  const fetchAnalytics = useCallback(async (selectedPeriod: AnalyticsPeriod, showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiFetch<AnalyticsData>(`/api/admin/analytics?period=${selectedPeriod}`);
      setData(res);
    } catch (err) {
      console.error("[AnalyticsViewer] Error loading analytics:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  // Export current station statuses to CSV
  const exportStationStatusCsv = () => {
    if (!data) return;

    const headers = [
      "Station ID",
      "Branch Name",
      "Station Name",
      "City",
      "Area",
      "Address",
      "Operating Status",
      "Benzine Status",
      "Benzine Liters",
      "Benzine Last Updated",
      "Diesel Status",
      "Diesel Liters",
      "Diesel Last Updated",
      "Branch Manager",
      "Manager Phone",
      "Manager Telegram",
      "Reliability Uptime Rate (%)",
      "Outage Count In Period",
    ];

    const rows = data.stationsStatus.map((s) => [
      s.id,
      `"${(s.branchName || "").replace(/"/g, '""')}"`,
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${(s.city || "").replace(/"/g, '""')}"`,
      `"${(s.area || "").replace(/"/g, '""')}"`,
      `"${(s.address || "").replace(/"/g, '""')}"`,
      s.status,
      s.benzine?.status ?? "N/A",
      s.benzine?.liters ?? "N/A",
      s.benzine?.lastUpdated ? new Date(s.benzine.lastUpdated).toLocaleString() : "N/A",
      s.diesel?.status ?? "N/A",
      s.diesel?.liters ?? "N/A",
      s.diesel?.lastUpdated ? new Date(s.diesel.lastUpdated).toLocaleString() : "N/A",
      `"${(s.managerName || "Unassigned").replace(/"/g, '""')}"`,
      `"${(s.managerPhone || "").replace(/"/g, '""')}"`,
      `"${(s.managerTelegram || "").replace(/"/g, '""')}"`,
      `${s.uptimeRate}%`,
      s.outageCount,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `TAF_Station_Status_Report_${period.toUpperCase()}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export status change history to CSV
  const exportHistoryCsv = () => {
    if (!data) return;

    const headers = [
      "History ID",
      "Date & Time",
      "Branch Name",
      "Fuel Type",
      "Previous Status",
      "New Status",
      "Previous Liters",
      "New Liters",
      "Liters Change",
      "Updated By",
    ];

    const rows = data.statusHistory.map((h) => {
      const delta =
        typeof h.oldLiters === "number" && typeof h.newLiters === "number"
          ? h.newLiters - h.oldLiters
          : "N/A";
      return [
        h.id,
        new Date(h.changedAt).toLocaleString(),
        `"${(h.branchName || "").replace(/"/g, '""')}"`,
        `"${(h.fuelName || "").replace(/"/g, '""')}"`,
        h.oldStatus,
        h.newStatus,
        h.oldLiters ?? "N/A",
        h.newLiters ?? "N/A",
        delta,
        `"${(h.actorName || "Staff").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `TAF_Status_Change_History_${period.toUpperCase()}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy management summary
  const copyManagementSummary = () => {
    if (!data) return;
    const fromStr = new Date(data.range.from).toLocaleDateString([], { month: "short", day: "numeric" });
    const toStr = new Date(data.range.to).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

    const summaryText = [
      `📊 *TAF OIL ETHIOPIA - NETWORK STATUS REPORT*`,
      `📅 Period: ${period.toUpperCase()} (${fromStr} - ${toStr})`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *Network Availability:* ${data.summary.networkAvailabilityRate}%`,
      `⛽ *Total Benzine In Stock:* ${data.summary.totalBenzineLiters.toLocaleString()} Liters`,
      `🚛 *Total Diesel In Stock:* ${data.summary.totalDieselLiters.toLocaleString()} Liters`,
      `🏢 *Active Stations:* ${data.summary.activeStations}`,
      `🔄 *Status Updates:* ${data.summary.statusTransitionsCount}`,
      `👥 *User Inquiries/Views:* ${data.summary.eventsInPeriod.toLocaleString()}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Generated from TAF Admin Console: ${new Date().toLocaleString()}`,
    ].join("\n");

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Filtered stations
  const filteredStations = useMemo(() => {
    if (!data?.stationsStatus) return [];
    return data.stationsStatus.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.branchName.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.area && s.area.toLowerCase().includes(q)) ||
        (s.managerName && s.managerName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "AVAILABLE") {
        return s.benzine?.status === "AVAILABLE" || s.diesel?.status === "AVAILABLE";
      }
      if (statusFilter === "LIMITED") {
        return s.benzine?.status === "LIMITED" || s.diesel?.status === "LIMITED";
      }
      if (statusFilter === "OUT_OF_STOCK") {
        return s.benzine?.status === "OUT_OF_STOCK" && s.diesel?.status === "OUT_OF_STOCK";
      }
      return true;
    });
  }, [data?.stationsStatus, searchQuery, statusFilter]);

  // Max events in timeline for bar height scaling
  const maxTimelineTotal = useMemo(() => {
    if (!data?.timeline?.length) return 1;
    return Math.max(...data.timeline.map((t) => t.totalChanges), 1);
  }, [data?.timeline]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-neutral-500 font-medium">Failed to load analytics data.</p>
        <button
          onClick={() => fetchAnalytics(period)}
          className="mt-4 px-4 py-2 bg-brand-orange text-white rounded-xl font-bold text-xs"
        >
          Try Again
        </button>
      </Card>
    );
  }

  const statCards = [
    {
      label: "App Opens",
      value: data.byType.app_open,
      sub: "Active mobile sessions",
      icon: SparklesIcon,
      accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Nearby Station Searches",
      value: data.byType.nearby_search,
      sub: "Driver geolocation queries",
      icon: SearchIcon,
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Station Details Viewed",
      value: data.byType.station_view,
      sub: "Profile visits & map routing",
      icon: GasStationIcon,
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Fuel Filter Queries",
      value: data.byType.fuel_search,
      sub: "Benzine / Diesel searches",
      icon: TagIcon,
      accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Controls & Period Switcher Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-xs print:border-none print:p-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 text-white shadow-md shadow-brand-orange/20">
            <ChartIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                Network Status & Operations Analytics
              </h1>
              <Badge variant="brand" className="text-xs">
                {period === "day" ? "Past 24 Hours" : period === "week" ? "Past 7 Days" : "Past 30 Days"}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Time range: {new Date(data.range.from).toLocaleDateString([], { month: "short", day: "numeric" })} -{" "}
              {new Date(data.range.to).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Period Selector & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap print:hidden">
          {/* Day / Week / Month Toggle Group */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod("day")}
              className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                period === "day"
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Day (24h)
            </button>
            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                period === "week"
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Week (7d)
            </button>
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                period === "month"
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Month (30d)
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchAnalytics(period, true)}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
          >
            <RefreshIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin text-brand-orange" : ""}`} />
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportStationStatusCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              title="Download full CSV report of current station statuses and volumes"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Export Status (CSV)</span>
            </button>

            <button
              type="button"
              onClick={exportHistoryCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold text-xs transition-colors"
              title="Download historical logs of all status and liter transitions"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>History (CSV)</span>
            </button>

            <button
              type="button"
              onClick={copyManagementSummary}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Copy Summary to Clipboard for Telegram/Slack"
            >
              {copiedSummary ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
              title="Print or Save as PDF"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Network Core KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Availability Rate */}
        <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Network In-Stock Rate
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active Service
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {data.summary.networkAvailabilityRate}%
              </span>
              <span className="text-xs text-neutral-400 font-medium">fuel slots online</span>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, data.summary.networkAvailabilityRate))}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-neutral-400">Across {data.summary.activeStations} active branch stations</div>
          </CardContent>
        </Card>

        {/* Total Benzine Volume */}
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Benzine (Regular)
              </span>
              <span className="text-xs">🚗</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                {data.summary.totalBenzineLiters.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Liters</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Total Network Volume</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {data.stationsStatus.filter((s) => s.benzine?.status === "AVAILABLE").length} stations in stock
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Diesel Volume */}
        <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Diesel (Gas Oil)
              </span>
              <span className="text-xs">🚛</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                {data.summary.totalDieselLiters.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Liters</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Total Network Volume</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {data.stationsStatus.filter((s) => s.diesel?.status === "AVAILABLE").length} stations in stock
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Transitions Count */}
        <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-brand-orange/5 via-transparent to-transparent">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Branch Status Audits
              </span>
              <span className="p-1 rounded-md bg-orange-500/10 text-brand-orange text-xs font-bold">
                {period.toUpperCase()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-orange">
                {data.summary.statusTransitionsCount}
              </span>
              <span className="text-xs text-neutral-400">updates logged</span>
            </div>
            <div className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <TrendingUpIcon className="w-3.5 h-3.5 text-brand-orange" />
              <span>Verified by branch managers</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Station Status Timeline Breakdown Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ChartIcon className="w-4 h-4 text-brand-orange" />
                <span>Station Status Changes & Outage Distribution</span>
              </CardTitle>
              <CardDescription>
                Timeline activity showing status updates over {period === "day" ? "each hour" : period === "week" ? "the past 7 days" : "the past 30 days"}
              </CardDescription>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-neutral-600 dark:text-neutral-300">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500" />
                <span className="text-neutral-600 dark:text-neutral-300">Limited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500" />
                <span className="text-neutral-600 dark:text-neutral-300">Out of Stock</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2">
          {data.timeline.length === 0 || maxTimelineTotal === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <ChartIcon className="w-8 h-8 stroke-1 mb-2 text-neutral-300" />
              <p className="text-xs">No status change events recorded in this time window.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Timeline Histogram Bars */}
              <div className="h-48 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                {data.timeline.map((bucket, idx) => {
                  const total = bucket.totalChanges;
                  // minimum 8% height so empty bars still show subtle baseline
                  const heightPct = total === 0 ? 6 : Math.max(12, Math.round((total / maxTimelineTotal) * 100));

                  const availPct = total > 0 ? (bucket.available / total) * 100 : 0;
                  const limitPct = total > 0 ? (bucket.limited / total) * 100 : 0;
                  const oosPct = total > 0 ? (bucket.outOfStock / total) * 100 : 0;

                  const isHovered = hoveredBucket?.timestamp === bucket.timestamp;

                  return (
                    <div
                      key={bucket.timestamp || idx}
                      className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                      onMouseEnter={() => setHoveredBucket(bucket)}
                      onMouseLeave={() => setHoveredBucket(null)}
                    >
                      {/* Bar segment */}
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 overflow-hidden flex flex-col-reverse ${
                          total === 0 ? "bg-neutral-100 dark:bg-neutral-800/50" : isHovered ? "ring-2 ring-brand-orange ring-offset-1" : ""
                        }`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {total > 0 ? (
                          <>
                            {bucket.available > 0 && (
                              <div
                                style={{ height: `${availPct}%` }}
                                className="bg-emerald-500 hover:brightness-110 transition-all"
                              />
                            )}
                            {bucket.limited > 0 && (
                              <div
                                style={{ height: `${limitPct}%` }}
                                className="bg-amber-500 hover:brightness-110 transition-all"
                              />
                            )}
                            {bucket.outOfStock > 0 && (
                              <div
                                style={{ height: `${oosPct}%` }}
                                className="bg-rose-500 hover:brightness-110 transition-all"
                              />
                            )}
                          </>
                        ) : null}
                      </div>

                      {/* Hover Tooltip Popup */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-2 z-20 w-44 p-2.5 rounded-xl bg-neutral-900 text-white text-[11px] shadow-xl pointer-events-none transform -translate-x-1/2 left-1/2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="font-bold border-b border-neutral-700 pb-1 mb-1.5 flex items-center justify-between">
                            <span>{bucket.label}</span>
                            <span className="text-brand-orange">{bucket.totalChanges} changes</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-emerald-400">Available:</span>
                              <span className="font-mono font-bold">{bucket.available}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-amber-400">Limited:</span>
                              <span className="font-mono font-bold">{bucket.limited}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-rose-400">Out of Stock:</span>
                              <span className="font-mono font-bold">{bucket.outOfStock}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X Axis Labels */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1 font-mono">
                <span>{data.timeline[0]?.label}</span>
                <span>{data.timeline[Math.floor(data.timeline.length / 2)]?.label}</span>
                <span>{data.timeline[data.timeline.length - 1]?.label}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Station Status & Reliability Breakdown Table */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GasStationIcon className="w-4 h-4 text-brand-orange" />
                <span>Station Fuel Inventory & Reliability</span>
                <Badge variant="outline" className="text-xs">
                  {filteredStations.length} Stations
                </Badge>
              </CardTitle>
              <CardDescription>
                Live status, remaining liters, manager details, and period uptime for every branch
              </CardDescription>
            </div>

            {/* Table Filters & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter branch or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-orange w-44 sm:w-56"
                />
              </div>

              {/* Status Tabs */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "ALL" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs" : "text-neutral-500"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("AVAILABLE")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "AVAILABLE" ? "bg-emerald-500 text-white shadow-xs" : "text-neutral-500"
                  }`}
                >
                  In Stock
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("LIMITED")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "LIMITED" ? "bg-amber-500 text-white shadow-xs" : "text-neutral-500"
                  }`}
                >
                  Low Stock
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("OUT_OF_STOCK")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "OUT_OF_STOCK" ? "bg-rose-500 text-white shadow-xs" : "text-neutral-500"
                  }`}
                >
                  Out of Stock
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Station / Branch</th>
                  <th className="py-3 px-4">Benzine (Regular)</th>
                  <th className="py-3 px-4">Diesel (Gas Oil)</th>
                  <th className="py-3 px-4">Reliability</th>
                  <th className="py-3 px-4">Outages</th>
                  <th className="py-3 px-4">Branch Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredStations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      No stations match the search query or status filter.
                    </td>
                  </tr>
                ) : (
                  filteredStations.map((station) => {
                    const benzineStatus = station.benzine?.status;
                    const dieselStatus = station.diesel?.status;

                    return (
                      <tr
                        key={station.id}
                        className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors"
                      >
                        {/* Station Name & City */}
                        <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0" />
                            <div>
                              <div className="font-bold text-neutral-900 dark:text-white">
                                TAF {station.branchName}
                              </div>
                              <div className="text-[11px] text-neutral-400 font-normal">
                                {station.city} {station.area ? `• ${station.area}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Benzine Status & Liters */}
                        <td className="py-3.5 px-4">
                          {station.benzine ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    benzineStatus === "AVAILABLE"
                                      ? "bg-emerald-500"
                                      : benzineStatus === "LIMITED"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                />
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                  {benzineStatus === "AVAILABLE"
                                    ? "In Stock"
                                    : benzineStatus === "LIMITED"
                                    ? "Limited"
                                    : "Out of Stock"}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] text-neutral-500 font-medium">
                                {typeof station.benzine.liters === "number"
                                  ? `${station.benzine.liters.toLocaleString()} L`
                                  : "Unspecified"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">Not Offered</span>
                          )}
                        </td>

                        {/* Diesel Status & Liters */}
                        <td className="py-3.5 px-4">
                          {station.diesel ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    dieselStatus === "AVAILABLE"
                                      ? "bg-emerald-500"
                                      : dieselStatus === "LIMITED"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                />
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                  {dieselStatus === "AVAILABLE"
                                    ? "In Stock"
                                    : dieselStatus === "LIMITED"
                                    ? "Limited"
                                    : "Out of Stock"}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] text-neutral-500 font-medium">
                                {typeof station.diesel.liters === "number"
                                  ? `${station.diesel.liters.toLocaleString()} L`
                                  : "Unspecified"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">Not Offered</span>
                          )}
                        </td>

                        {/* Reliability Score */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 w-28">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span
                                className={
                                  station.uptimeRate >= 80
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : station.uptimeRate >= 50
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }
                              >
                                {station.uptimeRate}%
                              </span>
                              <span className="text-[10px] text-neutral-400 font-normal">uptime</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  station.uptimeRate >= 80
                                    ? "bg-emerald-500"
                                    : station.uptimeRate >= 50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.max(5, station.uptimeRate)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Outage Count */}
                        <td className="py-3.5 px-4">
                          {station.outageCount > 0 ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-[11px] font-bold">
                              {station.outageCount} Outage{station.outageCount > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">0 Outages</span>
                          )}
                        </td>

                        {/* Manager Contact */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {station.managerName || "Unassigned"}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                              {station.managerTelegram && (
                                <a
                                  href={`https://t.me/${station.managerTelegram.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline flex items-center gap-1"
                                >
                                  <SendIcon className="w-2.5 h-2.5" />
                                  <span>{station.managerTelegram}</span>
                                </a>
                              )}
                              {station.managerPhone && (
                                <span className="text-neutral-400 flex items-center gap-1">
                                  <PhoneIcon className="w-2.5 h-2.5" />
                                  <span>{station.managerPhone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Insights: Status Activity Feed & Top Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Status Updates Feed */}
        <Card>
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-brand-orange" />
                <span>Recent Fuel Status & Volume Changes</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                Last {Math.min(data.statusHistory.length, 100)} updates
              </Badge>
            </div>
            <CardDescription>
              Chronological log of staff adjustments during this period
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-1">
            {data.statusHistory.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No status or liter adjustments recorded in this period.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {data.statusHistory.slice(0, 15).map((h) => {
                  const isRefill =
                    typeof h.oldLiters === "number" &&
                    typeof h.newLiters === "number" &&
                    h.newLiters > h.oldLiters;
                  const literDelta =
                    typeof h.oldLiters === "number" && typeof h.newLiters === "number"
                      ? h.newLiters - h.oldLiters
                      : null;

                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">
                            TAF {h.branchName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold">
                            {h.fuelName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                          <span>
                            {h.oldStatus} ➔{" "}
                            <span
                              className={`font-bold ${
                                h.newStatus === "AVAILABLE"
                                  ? "text-emerald-600"
                                  : h.newStatus === "LIMITED"
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {h.newStatus}
                            </span>
                          </span>
                          <span>•</span>
                          <span>{h.actorName}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {typeof h.newLiters === "number" ? (
                          <div>
                            <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                              {h.newLiters.toLocaleString()} L
                            </div>
                            {literDelta !== null && literDelta !== 0 && (
                              <div
                                className={`text-[10px] font-bold ${
                                  isRefill ? "text-emerald-600" : "text-neutral-400"
                                }`}
                              >
                                {literDelta > 0 ? `+${literDelta.toLocaleString()} L` : `${literDelta.toLocaleString()} L`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 italic">No Liters</span>
                        )}
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {new Date(h.changedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Engagement & Popular Stations */}
        <div className="space-y-6">
          {/* Top Stations */}
          <Card>
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GasStationIcon className="w-4 h-4 text-emerald-500" />
                <span>Most In-Demand Stations</span>
              </CardTitle>
              <CardDescription>Station details visits and route requests by motorists</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              {data.topStations.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">No station views recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.topStations.map((s) => {
                    const max = Math.max(...data.topStations.map((t) => t.count), 1);
                    const pct = Math.round((s.count / max) * 100);
                    return (
                      <div key={s.stationId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="truncate">TAF {s.branchName}</span>
                          <span className="text-neutral-500 font-mono text-[11px] shrink-0">
                            {s.count.toLocaleString()} views
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-orange to-amber-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Interaction Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        {card.label}
                      </span>
                      <div className={`p-1 rounded-md ${card.accent}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                      {card.value.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{card.sub}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
