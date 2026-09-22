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
  const { logout } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
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
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          {/* Brand Info */}
          <div className="flex items-center gap-3.5">
            <div className="rounded-xl bg-white p-1 ring-1 ring-black/5 shadow-md shrink-0">
              <Image src="/brand/taf-logo.webp" alt="TAF" width={34} height={34} priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
                  TAF Control Center
                </h1>
                <Badge variant="brand">{user.role}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live System Connected
                </span>
                <span className="text-neutral-400 text-xs">·</span>
                <span className="text-xs text-neutral-500">{user.firstName}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-2">
            <Link
              href="/branch"
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:border-brand-orange/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              style={{ borderColor: "var(--border)" }}
            >
              <ZapIcon className="w-3.5 h-3.5 text-brand-orange" />
              <span>Branch Staff</span>
            </Link>

            <a
              href="https://t.me/taf_fuel_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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
              className="p-1.5 rounded-xl border hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-600 dark:text-neutral-400"
              style={{ borderColor: "var(--border)" }}
            >
              <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin text-brand-orange" : ""}`} />
            </button>

            <LocaleSwitcher />

            <button
              type="button"
              onClick={logout}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
              style={{ borderColor: "var(--border)" }}
            >
              Sign out
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
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:px-6 sm:py-6">
        {loading && !data ? (
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
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {tab === "overview" && data && (
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

                {/* KPI Metrics Cards (shadcn Style) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Bot Users */}
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => setTab("users")}
                    onKeyDown={(e) => e.key === "Enter" && setTab("users")}
                    className="cursor-pointer hover:border-brand-orange/60 hover:shadow-md transition group"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-brand-orange transition">
                          Bot Users
                        </span>
                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-brand-orange">
                          <UsersIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-brand-orange">
                        {data.stats.subscribers.totalUsers}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                        {data.stats.subscribers.newToday ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{data.stats.subscribers.newToday} today ·{" "}
                          </span>
                        ) : null}
                        <span>View directory →</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Stations */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Active Stations
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <GasStationIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                        {data.stats.stations.active}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        {data.stats.stations.open} open · {data.stats.stations.total} total
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fuel Types */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Fuel Types
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                          <TagIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                        {data.stats.fuelTypes.active}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        Benzine & Diesel active
                      </div>
                    </CardContent>
                  </Card>

                  {/* Alert Watches */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Alert Watches
                        </span>
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                          <BellIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                        {data.stats.subscribers.activeSubscriptions}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        Active station watch alerts
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivered Alerts */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Delivered Alerts
                        </span>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                          <MailIcon className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-3xl font-black text-neutral-900 dark:text-neutral-100">
                        {data.stats.notifications.sent}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
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
            )}

            {/* USERS TAB */}
            {tab === "users" && <UsersManager />}

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
