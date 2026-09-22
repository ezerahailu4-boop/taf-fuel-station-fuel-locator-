"use client";

import { useEffect, useState, useTransition } from "react";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const [isPending, startTransition] = useTransition();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
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
      {/* Header & Metric Banner */}
      <div
        className="rounded-2xl border p-5 shadow-sm space-y-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <h2 className="text-lg font-black tracking-tight">Telegram Bot Users</h2>
              <span className="rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-xs font-extrabold text-brand-orange">
                {total} registered
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live directory of all users who have launched or used the Telegram bot (@taf_fuel_bot)
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadUsers()}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition"
            style={{ borderColor: "var(--border)" }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-xs text-neutral-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name, @username, or Telegram ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border bg-transparent pl-8 pr-3 py-2 text-xs outline-none focus:border-brand-orange transition"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition whitespace-nowrap ${
                  roleFilter === rf.id
                    ? "bg-brand-orange text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : users.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="text-4xl mb-2">👤</div>
          <h3 className="text-sm font-bold">No bot users found</h3>
          <p className="text-xs text-neutral-400 mt-1">
            {search ? "Try a different search query." : "Users will appear here as soon as they interact with the bot."}
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-neutral-400 text-[11px] uppercase tracking-wider" style={{ borderColor: "var(--border)" }}>
                  <th className="p-3.5 pl-4 font-bold">User</th>
                  <th className="p-3.5 font-bold">Telegram ID</th>
                  <th className="p-3.5 font-bold">Role</th>
                  <th className="p-3.5 font-bold">Alert Watches</th>
                  <th className="p-3.5 font-bold">Joined</th>
                  <th className="p-3.5 pr-4 font-bold">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {users.map((u) => {
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
                  const initials = (u.firstName?.[0] || "U") + (u.lastName?.[0] || "");

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-neutral-500/5 transition"
                    >
                      {/* Name & Username */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-brand-orange/15 text-brand-orange font-bold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate text-neutral-800 dark:text-neutral-100">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {u.username ? `@${u.username}` : "No username"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Telegram ID */}
                      <td className="p-3.5 font-mono text-neutral-500 text-[11px]">
                        <code>{u.telegramUserId}</code>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            u.role === "SUPER_ADMIN"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : u.role === "BRANCH_ADMIN"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {u.role}
                          {u.station && ` (${u.station})`}
                        </span>
                      </td>

                      {/* Active Alerts */}
                      <td className="p-3.5">
                        {u.activeAlerts > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <span>🔔</span> {u.activeAlerts} stations
                          </span>
                        ) : (
                          <span className="text-neutral-400">None</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="p-3.5 text-neutral-500 text-[11px] whitespace-nowrap">
                        <RelativeTime value={u.createdAt} />
                      </td>

                      {/* Last Active */}
                      <td className="p-3.5 pr-4 text-neutral-500 text-[11px] whitespace-nowrap">
                        {u.lastLoginAt ? <RelativeTime value={u.lastLoginAt} /> : "Never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
