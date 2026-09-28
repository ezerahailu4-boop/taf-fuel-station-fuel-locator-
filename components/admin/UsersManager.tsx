"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchIcon, RefreshIcon, UsersIcon, BellIcon, ShieldCheckIcon } from "@/components/ui/icons";
import type { StationItem } from "./StationsManager";

export interface BotUserItem {
  id: string;
  telegramUserId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  preferredLocale: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  station: string | null;
  activeAlerts: number;
}

export function UsersManager({ stations = [] }: { stations?: StationItem[] }) {
  const [users, setUsers] = useState<BotUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [, startTransition] = useTransition();

  // Role editing modal state
  const [editingUser, setEditingUser] = useState<BotUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("CUSTOMER");
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [savingRole, setSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const data = await apiFetch<{ users: BotUserItem[]; total: number }>(`/api/admin/users?${params.toString()}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("[UsersManager] Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        loadUsers();
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, roleFilter]);

  const openEditRole = (u: BotUserItem) => {
    setEditingUser(u);
    setSelectedRole(u.role);
    setSelectedStationId("");
    setRoleError(null);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    if (selectedRole === "BRANCH_ADMIN" && !selectedStationId) {
      setRoleError("Please select a station for Branch Staff.");
      return;
    }

    setSavingRole(true);
    setRoleError(null);
    try {
      await apiFetch(`/api/admin/users/${editingUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: selectedRole,
          stationId: selectedRole === "BRANCH_ADMIN" ? selectedStationId : null,
        }),
      });

      // Update in local state
      const stationName =
        selectedRole === "BRANCH_ADMIN"
          ? stations.find((s) => s.id === selectedStationId)?.branchName ?? null
          : null;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, role: selectedRole, station: stationName }
            : u
        )
      );

      setEditingUser(null);
    } catch (err: any) {
      console.error("[UsersManager] Error updating role:", err);
      setRoleError(err.message || "Failed to update user role.");
    } finally {
      setSavingRole(false);
    }
  };

  const renderRoleBadge = (role: string, station?: string | null) => {
    if (role === "SUPER_ADMIN") {
      return (
        <Badge variant="brand" className="shrink-0 flex items-center gap-1">
          <ShieldCheckIcon className="w-3 h-3" />
          <span>SUPER ADMIN</span>
        </Badge>
      );
    }
    if (role === "OPERATIONS_ADMIN") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0">
          <span>⚡ OPERATIONS ADMIN</span>
        </span>
      );
    }
    if (role === "BRANCH_ADMIN") {
      return (
        <Badge variant="warning" className="shrink-0">
          <span>BRANCH STAFF{station ? ` (${station})` : ""}</span>
        </Badge>
      );
    }
    if (role === "VIEWER") {
      return (
        <Badge variant="outline" className="shrink-0">
          <span>VIEWER</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="shrink-0">
        <span>CUSTOMER</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <Card>
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-brand-orange">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-black">Telegram Bot Users & Roles</CardTitle>
                    <Badge variant="brand">{total} registered</Badge>
                  </div>
                  <CardDescription>
                    Directory of registered users. Promote users to Operations Admin or assign station staff.
                  </CardDescription>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers()}
              disabled={loading}
              className="self-start sm:self-auto"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-orange" : ""}`} />
              <span>Refresh Directory</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2">
          {/* Toolbar: Search + Role Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, @username, or Telegram ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border bg-transparent pl-9 pr-4 py-2 text-xs outline-none focus:border-brand-orange transition"
                style={{ borderColor: "var(--border)" }}
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-xl p-1 bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80">
              {[
                { id: "ALL", label: "All Users" },
                { id: "CUSTOMER", label: "Customers" },
                { id: "OPERATIONS_ADMIN", label: "Operations Admins" },
                { id: "BRANCH_ADMIN", label: "Branch Staff" },
                { id: "SUPER_ADMIN", label: "Super Admins" },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setRoleFilter(rf.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                    roleFilter === rf.id
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs font-bold border border-black/5 dark:border-white/5"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table / Directory */}
      {loading && users.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="p-3 w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-3 flex items-center justify-center">
            <UsersIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No bot users found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {search ? "No users match your query. Try clearing the search." : "Users will appear here automatically when they send /start to the bot."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Mobile Card List (sm:hidden) */}
          <div className="sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
            {users.map((u) => {
              const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
              const initials = (u.firstName?.[0] || "U") + (u.lastName?.[0] || "");
              return (
                <div key={u.id} className="p-4 space-y-3 hover:bg-neutral-500/5 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-brand-orange/15 text-brand-orange font-black flex items-center justify-center text-xs shrink-0 ring-1 ring-brand-orange/20">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {fullName}
                        </div>
                        <div className="text-xs text-neutral-400 truncate">
                          {u.username ? `@${u.username}` : "No username"}
                        </div>
                      </div>
                    </div>

                    {renderRoleBadge(u.role, u.station)}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-500/10 text-xs">
                    <div className="flex items-center gap-2">
                      <code className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                        ID: {u.telegramUserId}
                      </code>
                      {u.activeAlerts > 0 && (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                          <BellIcon className="w-3 h-3 text-emerald-500" />
                          <span>{u.activeAlerts} alerts</span>
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditRole(u)}
                      className="text-[11px] h-7 px-2.5 rounded-lg"
                    >
                      Change Role
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="border-b text-neutral-400 text-[11px] uppercase tracking-wider bg-neutral-500/5"
                  style={{ borderColor: "var(--border)" }}
                >
                  <th className="p-3.5 pl-5 font-bold">User</th>
                  <th className="p-3.5 font-bold">Telegram ID</th>
                  <th className="p-3.5 font-bold">Role</th>
                  <th className="p-3.5 font-bold">Station Watches</th>
                  <th className="p-3.5 font-bold">Joined</th>
                  <th className="p-3.5 font-bold">Last Active</th>
                  <th className="p-3.5 pr-5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {users.map((u) => {
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
                  const initials = (u.firstName?.[0] || "U") + (u.lastName?.[0] || "");

                  return (
                    <tr key={u.id} className="hover:bg-neutral-500/5 transition">
                      {/* Name & Avatar */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-orange/15 text-brand-orange font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-brand-orange/20">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate text-neutral-900 dark:text-neutral-100">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {u.username ? `@${u.username}` : "No username"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Telegram ID */}
                      <td className="p-3.5">
                        <code className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                          {u.telegramUserId}
                        </code>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        {renderRoleBadge(u.role, u.station)}
                      </td>

                      {/* Active Watches */}
                      <td className="p-3.5">
                        {u.activeAlerts > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            <BellIcon className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{u.activeAlerts} station watch</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">None</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="p-3.5 text-neutral-500 text-[11px] whitespace-nowrap">
                        <RelativeTime value={u.createdAt} />
                      </td>

                      {/* Last Active */}
                      <td className="p-3.5 text-neutral-500 text-[11px] whitespace-nowrap">
                        {u.lastLoginAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <RelativeTime value={u.lastLoginAt} />
                          </span>
                        ) : (
                          <span className="text-neutral-400">Never</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditRole(u)}
                          className="text-[11px] h-7 px-3 rounded-lg font-bold hover:bg-brand-orange/10 hover:text-brand-orange transition"
                        >
                          Change Role
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Role Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
                Change User Role
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Assign administrative permissions or promote this user.
              </p>
            </div>

            {/* User Info Card */}
            <div className="rounded-2xl p-3.5 border bg-neutral-50 dark:bg-neutral-900/50 space-y-1">
              <div className="font-bold text-xs" style={{ color: "var(--text)" }}>
                {[editingUser.firstName, editingUser.lastName].filter(Boolean).join(" ")}
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                <span>{editingUser.username ? `@${editingUser.username}` : "No username"}</span>
                <span>·</span>
                <span>ID: {editingUser.telegramUserId}</span>
              </div>
            </div>

            {roleError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {roleError}
              </div>
            )}

            {/* Role Options */}
            <div className="space-y-2">
              <label className="block text-xs font-bold" style={{ color: "var(--text)" }}>
                Select Role & Access Level
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: "OPERATIONS_ADMIN",
                    title: "⚡ Operations Admin",
                    desc: "Can view Overview, manage Feedback, update Stations, Fuel Types, and view Audit Logs.",
                    badge: "Recommended",
                  },
                  {
                    id: "BRANCH_ADMIN",
                    title: "⛽ Branch Staff",
                    desc: "Staff member restricted to updating fuel availability for one assigned station.",
                  },
                  {
                    id: "SUPER_ADMIN",
                    title: "👑 Super Admin",
                    desc: "Full system control, managing bot users, secrets, and system configuration.",
                  },
                  {
                    id: "CUSTOMER",
                    title: "👤 Customer",
                    desc: "Regular user of the bot and Telegram Mini App.",
                  },
                  {
                    id: "VIEWER",
                    title: "👁️ Read-only Viewer",
                    desc: "Can view metrics and station availability without edit permissions.",
                  },
                ].map((r) => {
                  const isSelected = selectedRole === r.id;
                  return (
                    <label
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-brand-orange bg-brand-orange/5 shadow-2xs"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="user_role"
                        checked={isSelected}
                        onChange={() => setSelectedRole(r.id)}
                        className="mt-0.5 text-brand-orange focus:ring-brand-orange"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                            {r.title}
                          </span>
                          {r.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
                              {r.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                          {r.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Station picker if BRANCH_ADMIN */}
            {selectedRole === "BRANCH_ADMIN" && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold" style={{ color: "var(--text)" }}>
                  Assign to Station <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full rounded-xl border p-2.5 text-xs bg-surface text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option value="">Select a station...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      TAF {s.branchName} ({s.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200/60 dark:border-neutral-800">
              <Button
                variant="ghost"
                size="sm"
                disabled={savingRole}
                onClick={() => setEditingUser(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={savingRole}
                onClick={handleSaveRole}
                className="text-xs rounded-xl px-5 font-bold"
              >
                {savingRole ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
