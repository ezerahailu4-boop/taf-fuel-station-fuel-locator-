"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { Page, ActivityDTO } from "@/types/stations";

export function AuditLogViewer() {
  const [logs, setLogs] = useState<ActivityDTO[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: String(page),
        pageSize: "15",
        ...(actionFilter ? { action: actionFilter } : {}),
      });
      const data = await apiFetch<Page<ActivityDTO>>(`/api/admin/activity?${query}`);
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("[audit-log] Failed to load activity:", err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Activity & Security Audit Log</h2>
          <p className="text-xs text-neutral-500">
            Immutable log of all fuel updates, station changes, and security authorization checks.
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border px-3 py-1.5 text-xs outline-none"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <option value="">All Actions</option>
          <option value="FUEL_STATUS_CHANGED">FUEL_STATUS_CHANGED</option>
          <option value="AVAILABILITY_CONFIRMED">AVAILABILITY_CONFIRMED</option>
          <option value="STATION_STATUS_CHANGED">STATION_STATUS_CHANGED</option>
          <option value="STATION_CREATED">STATION_CREATED</option>
          <option value="STATION_UPDATED">STATION_UPDATED</option>
          <option value="ADMIN_ASSIGNED">ADMIN_ASSIGNED</option>
          <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
          <option value="ACCESS_DENIED">ACCESS_DENIED</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50/50 text-xs text-neutral-500 dark:bg-neutral-900/50" style={{ borderColor: "var(--border)" }}>
            <tr>
              <th className="p-3.5">Time</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Actor</th>
              <th className="p-3.5">Station</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-neutral-500">
                  Loading logs…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-neutral-500">
                  No activity logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isDenied = log.action === "ACCESS_DENIED";
                return (
                  <tr
                    key={log.id}
                    className={`hover:bg-neutral-50/40 dark:hover:bg-neutral-800/30 ${
                      isDenied ? "bg-red-50/30 dark:bg-red-950/20" : ""
                    }`}
                  >
                    <td className="p-3.5 text-xs text-neutral-500 whitespace-nowrap">
                      <RelativeTime value={log.createdAt} />
                    </td>
                    <td className="p-3.5 font-mono text-xs">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-semibold ${
                          isDenied
                            ? "bg-red-100 text-red-800"
                            : log.action.includes("CONFIRMED")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs">
                      {log.actor ? `${log.actor.firstName} ${log.actor.lastName || ""}`.trim() : "System / Unauthenticated"}
                    </td>
                    <td className="p-3.5 text-xs font-medium">
                      {log.station ? `TAF ${log.station.branchName}` : "—"}
                    </td>
                    <td className="p-3.5 text-xs font-mono text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                      {log.newValue ? JSON.stringify(log.newValue) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 15 && (
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2">
          <span>
            Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total} events
          </span>
          <div className="space-x-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
