"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Skeleton } from "@/components/ui/Skeleton";

export interface AnalyticsData {
  summary: { total: number; last24h: number; last7d: number };
  byType: {
    station_view: number;
    nearby_search: number;
    fuel_search: number;
    app_open: number;
  };
  topFuels: Array<{ fuelTypeId: string; name: string; slug: string; icon: string; count: number }>;
  topStations: Array<{ stationId: string; branchName: string; name: string; count: number }>;
}

export function AnalyticsViewer() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AnalyticsData>("/api/admin/analytics")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-neutral-500">Failed to load analytics data.</p>;
  }

  const statCards = [
    { label: "Total App Opens", value: data.byType.app_open, icon: "📱", color: "border-blue-500/30" },
    { label: "Nearby Searches", value: data.byType.nearby_search, icon: "📍", color: "border-amber-500/30" },
    { label: "Station Views", value: data.byType.station_view, icon: "⛽", color: "border-emerald-500/30" },
    { label: "Fuel Searches", value: data.byType.fuel_search, icon: "🔍", color: "border-purple-500/30" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Analytics & Usage Trends</h2>
        <p className="text-xs text-neutral-500">
          Privacy-safe aggregate metrics. Coordinates and personal data are never recorded.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 shadow-sm ${card.color}`}
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{card.icon}</span>
              <span className="text-2xl font-black text-neutral-900 dark:text-white">
                {card.value.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-neutral-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Time Window Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popular Fuels */}
        <div
          className="rounded-2xl border p-5 shadow-sm space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3 className="font-bold text-sm">Most Searched Fuel Types</h3>
          {data.topFuels.length === 0 ? (
            <p className="text-xs text-neutral-400">No searches recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.topFuels.map((f) => (
                <div key={f.fuelTypeId} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span>{f.icon}</span>
                    <span>{f.name}</span>
                  </div>
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 font-bold">
                    {f.count} searches
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Visited Stations */}
        <div
          className="rounded-2xl border p-5 shadow-sm space-y-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3 className="font-bold text-sm">Top Visited Stations</h3>
          {data.topStations.length === 0 ? (
            <p className="text-xs text-neutral-400">No station views recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.topStations.map((s) => (
                <div key={s.stationId} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2 truncate">
                    <span>📍</span>
                    <span className="truncate">TAF {s.branchName}</span>
                  </div>
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 font-bold shrink-0">
                    {s.count} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
