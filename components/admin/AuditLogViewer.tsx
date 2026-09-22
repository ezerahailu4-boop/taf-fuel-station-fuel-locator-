"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuditIcon, ShieldCheckIcon } from "@/components/ui/icons";
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-brand-orange">
                <AuditIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-black">Activity & Security Audit Log</CardTitle>
                  <Badge variant="brand">{total} Events</Badge>
                </div>
                <CardDescription>
                  Immutable audit trail of all fuel updates, branch changes, and security authorization checks.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border px-3 py-2 text-xs font-semibold outline-none focus:border-brand-orange transition"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <option value="">All Audit Actions</option>
                <option value="FUEL_STATUS_CHANGED">FUEL_STATUS_CHANGED</option>
                <option value="USER_STARTED_BOT">USER_STARTED_BOT</option>
                <option value="AVAILABILITY_CONFIRMED">AVAILABILITY_CONFIRMED</option>
                <option value="STATION_STATUS_CHANGED">STATION_STATUS_CHANGED</option>
                <option value="STATION_CREATED">STATION_CREATED</option>
                <option value="STATION_UPDATED">STATION_UPDATED</option>
                <option value="ADMIN_ASSIGNED">ADMIN_ASSIGNED</option>
                <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
                <option value="ACCESS_DENIED">ACCESS_DENIED</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b text-neutral-400 text-[11px] uppercase tracking-wider bg-neutral-500/5"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="p-3.5 pl-5 font-bold">Time</th>
                <th className="p-3.5 font-bold">Action</th>
                <th className="p-3.5 font-bold">Actor</th>
                <th className="p-3.5 font-bold">Station</th>
                <th className="p-3.5 pr-5 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-neutral-400">
                    Loading audit trail…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-neutral-400">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isDenied = log.action === "ACCESS_DENIED";
                  const isUserJoined = log.action === "USER_STARTED_BOT";
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-neutral-500/5 transition ${
                        isDenied ? "bg-red-50/30 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5 pl-5 text-neutral-500 whitespace-nowrap">
                        <RelativeTime value={log.createdAt} />
                      </td>
                      <td className="p-3.5 font-mono">
                        <Badge
                          variant={
                            isDenied
                              ? "destructive"
                              : isUserJoined
                              ? "brand"
                              : log.action.includes("CONFIRMED")
                              ? "success"
                              : "secondary"
                          }
                        >
                          {isDenied && <ShieldCheckIcon className="w-3 h-3 text-red-500" />}
                          <span>{log.action}</span>
                        </Badge>
                      </td>
                      <td className="p-3.5 font-medium text-neutral-800 dark:text-neutral-200">
                        {log.actor
                          ? `${log.actor.firstName} ${log.actor.lastName || ""}`.trim()
                          : "System"}
                      </td>
                      <td className="p-3.5 font-semibold text-neutral-700 dark:text-neutral-300">
                        {log.station ? `TAF ${log.station.branchName}` : "—"}
                      </td>
                      <td className="p-3.5 pr-5 font-mono text-neutral-500 dark:text-neutral-400 max-w-xs truncate">
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
          <div
            className="flex items-center justify-between text-xs text-neutral-500 p-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <span>
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total} events
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 15 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
