"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartIcon, GasStationIcon, TagIcon, SearchIcon, SparklesIcon } from "@/components/ui/icons";

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-neutral-500">Failed to load analytics data.</p>;
  }

  const statCards = [
    {
      label: "Total App Opens",
      value: data.byType.app_open,
      icon: SparklesIcon,
      accent: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Nearby GPS Searches",
      value: data.byType.nearby_search,
      icon: SearchIcon,
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Station Details Views",
      value: data.byType.station_view,
      icon: GasStationIcon,
      accent: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Fuel Search Queries",
      value: data.byType.fuel_search,
      icon: TagIcon,
      accent: "bg-purple-500/10 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="p-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-brand-orange">
              <ChartIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black">Analytics & Usage Trends</CardTitle>
                <Badge variant="brand">{data.summary.total} Total Events</Badge>
              </div>
              <CardDescription>
                Privacy-safe aggregate metrics. Coordinates and personal data are never stored.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {card.label}
                  </span>
                  <div className={`p-1.5 rounded-lg ${card.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                  {card.value.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">Recorded interactions</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popular Fuels */}
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-brand-orange" />
              <span>Most Searched Fuels</span>
            </CardTitle>
            <CardDescription>Customer demand breakdown by fuel type</CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-1">
            {data.topFuels.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4">No searches recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topFuels.map((f) => {
                  const max = Math.max(...data.topFuels.map((t) => t.count), 1);
                  const pct = Math.round((f.count / max) * 100);
                  return (
                    <div key={f.fuelTypeId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span>{f.icon}</span>
                          <span>{f.name}</span>
                        </span>
                        <span className="text-neutral-500 font-mono text-[11px]">
                          {f.count} searches
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-orange transition-all duration-500"
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

        {/* Most Visited Stations */}
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <GasStationIcon className="w-4 h-4 text-brand-orange" />
              <span>Top Visited Stations</span>
            </CardTitle>
            <CardDescription>Station details page views and navigation taps</CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-1">
            {data.topStations.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4">No station views recorded yet.</p>
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
                          {s.count} views
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
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
      </div>
    </div>
  );
}
