"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchIcon, RefreshIcon, UsersIcon, BellIcon, ShieldCheckIcon } from "@/components/ui/icons";

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

export function UsersManager() {
  const [users, setUsers] = useState<BotUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [, startTransition] = useTransition();

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
                    <CardTitle className="text-lg font-black">Telegram Bot Users</CardTitle>
                    <Badge variant="brand">{total} registered</Badge>
                  </div>
                  <CardDescription>
                    Directory of all users who have launched or used @taf_fuel_bot
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
          <div className="overflow-x-auto">
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
                  <th className="p-3.5 pr-5 font-bold">Last Active</th>
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
                        <Badge
                          variant={
                            u.role === "SUPER_ADMIN"
                              ? "brand"
                              : u.role === "BRANCH_ADMIN"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {u.role === "SUPER_ADMIN" && <ShieldCheckIcon className="w-3 h-3" />}
                          <span>
                            {u.role}
                            {u.station && ` (${u.station})`}
                          </span>
                        </Badge>
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
                      <td className="p-3.5 pr-5 text-neutral-500 text-[11px] whitespace-nowrap">
                        {u.lastLoginAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <RelativeTime value={u.lastLoginAt} />
                          </span>
                        ) : (
                          <span className="text-neutral-400">Never</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
