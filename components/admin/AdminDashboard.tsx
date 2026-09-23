"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardIcon,
  UsersIcon,
  GasStationIcon,
  TagIcon,
  ChartIcon,
  SettingsIcon,
  AuditIcon,
  ZapIcon,
  BellIcon,
  RefreshIcon,
  ArrowUpRightIcon,
  MailIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import type { PublicUser } from "@/types/auth";
import { StationsManager, type StationItem } from "./StationsManager";
import { FuelTypesManager, type FuelTypeItem } from "./FuelTypesManager";
import { SettingsManager } from "./SettingsManager";
import { AnalyticsViewer } from "./AnalyticsViewer";
import { AuditLogViewer } from "./AuditLogViewer";
import { UsersManager } from "./UsersManager";

export interface OverviewData {
  stats: {
    stations: { total: number; active: number; open: number };
    fuelTypes: { total: number; active: number };
    subscribers: {
      totalUsers: number;
      customersCount?: number;
      newToday?: number;
      activeSubscriptions: number;
    };
    notifications: { sent: number; pending: number; blocked: number };
  };
  recentUsers?: Array<{
    id: string;
    telegramUserId: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    activeAlerts: number;
  }>;
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

export type TabId = "overview" | "users" | "stations" | "fuels" | "settings" | "analytics" | "audit";

export function AdminDashboard({ user }: { user: PublicUser }) {
  const { api, logout } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<OverviewData | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelTypeItem[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [overviewRes, fuelTypesRes, settingsRes] = await Promise.allSettled([
        api<OverviewData>("/api/admin/overview"),
        api<{ items?: FuelTypeItem[] } | FuelTypeItem[]>("/api/fuel-types?all=1"),
        api<{ settings: Record<string, unknown> }>("/api/admin/settings"),
      ]);

      if (overviewRes.status === "fulfilled") {
        setData(overviewRes.value);
      } else {
        console.error("[admin-dashboard] Error loading overview:", overviewRes.reason);
        const reason = overviewRes.reason;
        const msg = reason instanceof Error ? reason.message : "Unable to load overview metrics.";
        setFetchError(`${msg} Please retry or check your admin access.`);
      }

      if (fuelTypesRes.status === "fulfilled") {
        const val = fuelTypesRes.value;
        const items = Array.isArray(val) ? val : Array.isArray(val?.items) ? val.items : [];
        setFuelTypes(items);
      }

      if (settingsRes.status === "fulfilled") {
        setSettings(settingsRes.value?.settings ?? {});
      }
    } catch (err) {
      console.error("[admin-dashboard] Fatal loading error:", err);
      setFetchError("An unexpected error occurred while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  interface NavItem {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | undefined;
  }

  const navItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: DashboardIcon },
    {
      id: "users",
      label: "Bot Users",
      icon: UsersIcon,
      badge: data?.stats.subscribers.totalUsers,
    },
    { id: "stations", label: "Stations", icon: GasStationIcon },
    { id: "fuels", label: "Fuel Types", icon: TagIcon },
    { id: "analytics", label: "Analytics", icon: ChartIcon },
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "audit", label: "Audit Log", icon: AuditIcon },
  ];

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Ambient Radial Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-amber-500/10 via-amber-500/2 to-transparent blur-3xl z-0"
      />

      {/* TAF Logo Ambient Watermark Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center select-none overflow-hidden z-0"
      >
        <Image
          src="/brand/taf-logo.webp"
          alt=""
          width={720}
          height={720}
          priority
          className="opacity-[0.035] dark:opacity-[0.025] scale-110 filter blur-[0.5px] object-contain"
        />
      </div>

      {/* Top Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl relative"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 gap-2">
          {/* Brand Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="rounded-xl bg-white p-1 ring-1 ring-black/5 shadow-xs shrink-0">
              <Image src="/brand/taf-logo.webp" alt="TAF" width={32} height={32} priority className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight truncate">
                  TAF Control
                </h1>
                <Badge variant="brand" className="text-[10px] px-1.5 py-0.5 sm:text-xs shrink-0">{user.role}</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px]">
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden xs:inline">Live</span> Connected
                </span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500 truncate max-w-[70px] sm:max-w-none">{user.firstName}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/branch"
              className="inline-flex items-center gap-1 rounded-xl border px-2 sm:px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:border-brand-orange/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shadow-2xs active:scale-95"
              style={{ borderColor: "var(--border)" }}
              title="Branch Staff Portal"
            >
              <ZapIcon className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              <span className="hidden sm:inline">Branch Staff</span>
            </Link>

            <a
              href="https://t.me/taf_fuel_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shadow-2xs"
              style={{ borderColor: "var(--border)" }}
            >
              <span>Bot</span>
              <ArrowUpRightIcon className="w-3 h-3 text-neutral-400" />
            </a>

            <button
              type="button"
              onClick={() => fetchOverview()}
              disabled={loading}
              title="Refresh Live Data"
              className="p-1.5 sm:p-2 rounded-xl border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-600 dark:text-neutral-400 active:scale-95 shadow-2xs cursor-pointer"
              style={{ borderColor: "var(--border)" }}
            >
              <RefreshIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin text-brand-orange" : ""}`} />
            </button>

            <LocaleSwitcher />
            <ThemeToggle />

            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="rounded-xl border px-2 sm:px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition active:scale-95 shadow-2xs cursor-pointer"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden">Exit</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation (shadcn segmented control style) */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-2.5 pt-1">
          <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl p-1 bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm font-bold border border-black/5 dark:border-white/5"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-brand-orange" : "text-neutral-400"
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? "bg-brand-orange text-white"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:px-6 sm:py-6 relative z-10">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          loading && !data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : data ? (
            <div className="space-y-6">
                {/* Hero Greeting & Quick Action Banner */}
                <div
                  className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, var(--surface) 0%, rgba(243, 156, 52, 0.05) 100%)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-brand-orange" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                        Executive Overview
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 mt-1">
                      Welcome, {user.firstName} 👋
                    </h2>
                    <p className="text-xs text-neutral-500 max-w-xl mt-0.5">
                      Live status of fuel inventory, Telegram bot activity, customer subscriptions, and branch operations.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/branch">
                      <Button variant="brand" size="sm">
                        <ZapIcon className="w-3.5 h-3.5 text-neutral-950" />
                        <span>Update Fuel at Tolroad</span>
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => setTab("users")}>
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span>View All Users ({data.stats.subscribers.totalUsers})</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setTab("stations")}>
                      <GasStationIcon className="w-3.5 h-3.5" />
                      <span>Stations</span>
                    </Button>
                  </div>
                </div>

                {/* KPI Metrics Cards (Vibrant Brand Style) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Bot Users */}
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => setTab("users")}
                    onKeyDown={(e) => e.key === "Enter" && setTab("users")}
                    className="cursor-pointer border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-transparent hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10 transition-all group"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 group-hover:text-brand-orange transition">
                          Bot Users
                        </span>
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-brand-orange shadow-xs">
                          <UsersIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                        {data.stats.subscribers.totalUsers}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {data.stats.subscribers.newToday ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{data.stats.subscribers.newToday} today ·{" "}
                          </span>
                        ) : null}
                        <span className="group-hover:translate-x-0.5 transition-transform inline-block">View directory →</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Stations */}
                  <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-transparent hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Active Stations
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs">
                          <GasStationIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {data.stats.stations.active}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {data.stats.stations.open} open · {data.stats.stations.total} total
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fuel Types */}
                  <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-transparent hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          Fuel Types
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-xs">
                          <TagIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                        {data.stats.fuelTypes.active}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        Benzine & Diesel active
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alert Watches */}
                  <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-card to-transparent hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                          Alert Watches
                        </span>
                        <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-xs">
                          <BellIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-orange-600 dark:text-orange-400">
                        {data.stats.subscribers.activeSubscriptions}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        Active station watch alerts
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivered Alerts */}
                  <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-transparent hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all col-span-2 lg:col-span-1">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                          Delivered Alerts
                        </span>
                        <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 shadow-xs">
                          <MailIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {data.stats.notifications.sent}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {data.stats.notifications.pending} pending in queue
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Live Stations Snapshot */}
                <Card>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <GasStationIcon className="w-4 h-4 text-brand-orange" />
                          <span>Active Station Network</span>
                        </CardTitle>
                        <CardDescription>
                          Real-time fuel availability and branch staff assignments
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTab("stations")}
                        className="text-brand-orange font-bold text-xs"
                      >
                        <span>Manage all stations</span>
                        <ArrowUpRightIcon className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {data.stations.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-brand-orange/40 transition"
                          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-100">
                                  TAF {s.branchName}
                                </h3>
                                <span className="text-[10px] text-neutral-400">({s.city})</span>
                              </div>
                              <p className="text-xs text-neutral-500 mt-0.5">{s.address}</p>
                            </div>
                            <StationStatusBadge status={s.status} />
                          </div>

                          {/* Fuels chips */}
                          {s.fuels && s.fuels.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {s.fuels.map((f) => (
                                <span
                                  key={f.slug}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                                    f.status === "AVAILABLE"
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                      : f.status === "LIMITED"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                      : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
                                  }`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      f.status === "AVAILABLE"
                                        ? "bg-emerald-500"
                                        : f.status === "LIMITED"
                                        ? "bg-amber-500"
                                        : "bg-neutral-400"
                                    }`}
                                  />
                                  <span>
                                    {f.icon} {f.nameEn}: {f.status}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}

                          <div
                            className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <span className="text-[11px]">
                              Manager: <strong className="font-semibold">{s.admin?.name ?? "Tolroad Staff"}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <Link
                                href="/branch"
                                className="font-bold text-xs text-brand-orange hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>Update Fuel</span>
                                <ZapIcon className="w-3 h-3 text-brand-orange" />
                              </Link>
                              <span className="text-neutral-300">·</span>
                              <Link
                                href={`/stations/${s.id}`}
                                className="font-medium text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                              >
                                View Map →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Dual Column: Recent Bot Users & System Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Bot Users */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-brand-orange" />
                            <span>Recent Bot Users</span>
                          </CardTitle>
                          <CardDescription>
                            Latest Telegram users who started @taf_fuel_bot
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTab("users")}
                          className="text-xs text-brand-orange font-bold"
                        >
                          View all ({data.stats.subscribers.totalUsers}) →
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-1">
                      {data.recentUsers && data.recentUsers.length > 0 ? (
                        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                          {data.recentUsers.slice(0, 5).map((u) => {
                            const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
                            const initials = (u.firstName?.[0] || "U") + (u.lastName?.[0] || "");
                            return (
                              <div
                                key={u.id}
                                className="py-3 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-8 w-8 rounded-full bg-brand-orange/15 text-brand-orange font-black flex items-center justify-center text-xs shrink-0 ring-1 ring-brand-orange/20">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold truncate text-neutral-800 dark:text-neutral-100">
                                      {fullName}
                                    </div>
                                    <div className="text-[11px] text-neutral-400 truncate">
                                      {u.username ? `@${u.username}` : `ID: ${u.telegramUserId}`}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <Badge variant={u.role === "SUPER_ADMIN" ? "brand" : "secondary"}>
                                    {u.role}
                                  </Badge>
                                  <div className="text-[10px] text-neutral-400 mt-1">
                                    <RelativeTime value={u.createdAt} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-neutral-400 text-xs">
                          No users registered yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent System Activity */}
                  <Card>
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <AuditIcon className="w-4 h-4 text-brand-orange" />
                            <span>System Activity Timeline</span>
                          </CardTitle>
                          <CardDescription>
                            Immutable audit trail of actions taken
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTab("audit")}
                          className="text-xs text-brand-orange font-bold"
                        >
                          Full audit log →
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-1">
                      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {data.recentActivity.slice(0, 5).map((act) => (
                          <div
                            key={act.id}
                            className="py-3 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                                  {act.action}
                                </span>
                                {act.branchName && (
                                  <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400 font-medium">
                                    @{act.branchName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-400 mt-0.5">
                                by {act.actorName} {act.actorRole ? `(${act.actorRole})` : ""}
                              </div>
                            </div>
                            <span className="text-[11px] text-neutral-400 shrink-0">
                              <RelativeTime value={act.createdAt} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="p-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    Overview Metrics Unavailable
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    {fetchError || "Could not retrieve real-time metrics. Please retry or sign in again."}
                  </p>
                </div>
                <Button variant="brand" size="sm" onClick={fetchOverview}>
                  <RefreshIcon className="w-3.5 h-3.5" />
                  <span>Retry Loading</span>
                </Button>
              </Card>
            )
          )}

          {/* USERS TAB */}
          {tab === "users" && <UsersManager />}

          {/* STATIONS TAB */}
          {tab === "stations" && (
            <StationsManager
              stations={data?.stations ?? []}
              loading={loading && !data}
              onRefresh={fetchOverview}
            />
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
      </main>
    </div>
  );
}
