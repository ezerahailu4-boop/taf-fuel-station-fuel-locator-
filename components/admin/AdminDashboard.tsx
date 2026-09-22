"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { Skeleton } from "@/components/ui/Skeleton";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { PublicUser } from "@/types/auth";
import { StationsManager, type StationItem } from "./StationsManager";
import { FuelTypesManager, type FuelTypeItem } from "./FuelTypesManager";
import { SettingsManager } from "./SettingsManager";
import { AnalyticsViewer } from "./AnalyticsViewer";
import { AuditLogViewer } from "./AuditLogViewer";

export interface OverviewData {
  stats: {
    stations: { total: number; active: number; open: number };
    fuelTypes: { total: number; active: number };
    subscribers: { totalUsers: number; activeSubscriptions: number };
    notifications: { sent: number; pending: number; blocked: number };
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    actorName: string;
    actorRole: string | null;
    branchName: string | null;
    newValue: unknown;
  }>;
  stations: StationItem[];
}

export function AdminDashboard({ user }: { user: PublicUser }) {
  const { logout } = useAuth();
  const [tab, setTab] = useState<"overview" | "stations" | "fuels" | "settings" | "analytics" | "audit">("overview");
  const [data, setData] = useState<OverviewData | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelTypeItem[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewData, fuelTypesData, settingsData] = await Promise.all([
        apiFetch<OverviewData>("/api/admin/overview"),
        apiFetch<FuelTypeItem[]>("/api/fuel-types?all=1"),
        apiFetch<{ settings: Record<string, unknown> }>("/api/admin/settings").catch(() => ({ settings: {} })),
      ]);
      setData(overviewData);
      setFuelTypes(fuelTypesData);
      setSettings(settingsData.settings);
    } catch (err) {
      console.error("[admin-dashboard] Error loading:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const navItems = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "stations", label: "Stations", icon: "⛽" },
    { id: "fuels", label: "Fuel Types", icon: "🏷️" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "audit", label: "Audit Log", icon: "📜" },
  ] as const;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-1 ring-1 ring-black/5 shadow-sm">
              <Image src="/brand/taf-logo.webp" alt="TAF" width={32} height={32} priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base leading-tight">TAF Admin Portal</h1>
                <span className="rounded-md bg-brand-orange/20 px-2 py-0.5 text-[11px] font-bold text-brand-orange">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Signed in as {user.firstName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/branch"
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
              style={{ borderColor: "var(--border)" }}
            >
              ⚡ Branch Portal
            </Link>
            <LocaleSwitcher />
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              style={{ borderColor: "var(--border)" }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-6xl px-4 flex gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap ${
                tab === item.id
                  ? "border-brand-orange text-brand-orange font-bold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        {loading && !data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {tab === "overview" && data && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span className="text-xs font-bold uppercase">Stations</span>
                      <span className="text-xl">⛽</span>
                    </div>
                    <div className="mt-2 text-3xl font-black">{data.stats.stations.active}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {data.stats.stations.open} open · {data.stats.stations.total} total
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span className="text-xs font-bold uppercase">Fuel Types</span>
                      <span className="text-xl">🏷️</span>
                    </div>
                    <div className="mt-2 text-3xl font-black">{data.stats.fuelTypes.active}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {data.stats.fuelTypes.total} configured
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span className="text-xs font-bold uppercase">Alert Subscriptions</span>
                      <span className="text-xl">🔔</span>
                    </div>
                    <div className="mt-2 text-3xl font-black">{data.stats.subscribers.activeSubscriptions}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      across {data.stats.subscribers.totalUsers} registered users
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span className="text-xs font-bold uppercase">Delivered Alerts</span>
                      <span className="text-xl">✉️</span>
                    </div>
                    <div className="mt-2 text-3xl font-black">{data.stats.notifications.sent}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {data.stats.notifications.pending} pending queue
                    </div>
                  </div>
                </div>

                {/* Live Stations Snapshot */}
                <div className="rounded-2xl border p-5 shadow-sm space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold">Active Stations</h2>
                      <p className="text-xs text-neutral-500">Live availability and staff assignment</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("stations")}
                      className="text-xs font-semibold text-brand-orange hover:underline"
                    >
                      Manage all stations →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.stations.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border p-3.5 flex flex-col justify-between gap-2"
                        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-sm">TAF {s.branchName}</h3>
                            <p className="text-xs text-neutral-500">{s.address}</p>
                          </div>
                          <StationStatusBadge status={s.status} />
                        </div>

                        {/* Fuels chips */}
                        {s.fuels && s.fuels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {s.fuels.map((f) => (
                              <span
                                key={f.slug}
                                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                  f.status === "AVAILABLE"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : f.status === "LIMITED"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                }`}
                              >
                                {f.icon} {f.nameEn}: {f.status}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                          <span>Manager: {s.admin?.name ?? "Unassigned"}</span>
                          <Link href={`/stations/${s.id}`} className="font-semibold text-brand-orange hover:underline">
                            View Customer Details →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl border p-5 shadow-sm space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Recent System Activity</h2>
                    <button
                      type="button"
                      onClick={() => setTab("audit")}
                      className="text-xs font-semibold text-brand-orange hover:underline"
                    >
                      View full audit log →
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {data.recentActivity.slice(0, 5).map((act) => (
                      <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                            {act.action}
                          </span>
                          <span className="text-neutral-400 ml-2">by {act.actorName}</span>
                          {act.branchName && (
                            <span className="text-neutral-500 ml-1">@ TAF {act.branchName}</span>
                          )}
                        </div>
                        <span className="text-neutral-400">
                          <RelativeTime value={act.createdAt} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STATIONS TAB */}
            {tab === "stations" && data && (
              <StationsManager stations={data.stations} onRefresh={fetchOverview} />
            )}

            {/* FUEL TYPES TAB */}
            {tab === "fuels" && (
              <FuelTypesManager fuelTypes={fuelTypes} onRefresh={fetchOverview} />
            )}

            {/* SETTINGS TAB */}
            {tab === "settings" && (
              <SettingsManager initialSettings={settings} onRefresh={fetchOverview} />
            )}

            {/* ANALYTICS TAB */}
            {tab === "analytics" && <AnalyticsViewer />}

            {/* AUDIT LOG TAB */}
            {tab === "audit" && <AuditLogViewer />}
          </>
        )}
      </main>
    </div>
  );
}
