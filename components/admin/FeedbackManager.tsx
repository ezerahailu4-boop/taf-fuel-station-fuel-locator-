"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshIcon } from "@/components/ui/icons";
import type { StationItem } from "./StationsManager";

export interface FeedbackItem {
  id: string;
  userId: string | null;
  name: string | null;
  contact: string | null;
  message: string;
  stationId: string | null;
  status: "NEW" | "RESOLVED";
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  station?: {
    id: string;
    name: string;
    branchName: string;
    city: string;
    area: string | null;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    role: string;
  } | null;
}

export function FeedbackManager({ stations = [] }: { stations?: StationItem[] }) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "NEW" | "RESOLVED">("all");
  const [stationFilter, setStationFilter] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [, startTransition] = useTransition();

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (stationFilter) params.set("stationId", stationFilter);

      const data = await apiFetch<{ items: FeedbackItem[]; total: number; newCount: number }>(
        `/api/admin/feedback?${params.toString()}`
      );
      setFeedbacks(data.items || []);
      setTotal(data.total || 0);
      setNewCount(data.newCount || 0);
    } catch (err) {
      console.error("[FeedbackManager] Error loading feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadFeedbacks();
    });
  }, [statusFilter, stationFilter]);

  const toggleStatus = async (item: FeedbackItem) => {
    setSavingId(item.id);
    const newStatus = item.status === "NEW" ? "RESOLVED" : "NEW";
    try {
      await apiFetch(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: newStatus } : f))
      );
      setNewCount((prev) => (newStatus === "RESOLVED" ? Math.max(0, prev - 1) : prev + 1));
    } catch (err) {
      console.error("[FeedbackManager] Error updating status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    setSavingId(id);
    try {
      await apiFetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ adminNotes: noteText.trim() || null }),
      });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, adminNotes: noteText.trim() || null } : f))
      );
      setEditingNotesId(null);
    } catch (err) {
      console.error("[FeedbackManager] Error saving notes:", err);
      alert("Failed to save note.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer feedback?")) return;
    setSavingId(id);
    try {
      await apiFetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[FeedbackManager] Error deleting feedback:", err);
      alert("Failed to delete feedback.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "var(--text)" }}>
            Customer Feedback & Issues
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Review and resolve messages, issue reports, and feedback submitted by Mini App customers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFeedbacks}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl border bg-surface/50">
          <p className="text-xs font-medium text-neutral-500">Total Submissions</p>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--text)" }}>
            {total}
          </p>
        </Card>
        <Card className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">New / Pending</p>
            {newCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {newCount}
          </p>
        </Card>
        <Card className="p-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Resolved</p>
          <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {Math.max(0, total - newCount)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="flex items-center rounded-xl p-1 border bg-neutral-100 dark:bg-neutral-800 text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === "all"
                ? "bg-white dark:bg-neutral-700 shadow-2xs text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => setStatusFilter("NEW")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === "NEW"
                ? "bg-white dark:bg-neutral-700 shadow-2xs text-amber-600 dark:text-amber-400"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <span>Pending</span>
            {newCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {newCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter("RESOLVED")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === "RESOLVED"
                ? "bg-white dark:bg-neutral-700 shadow-2xs text-emerald-600 dark:text-emerald-400"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            Resolved ({Math.max(0, total - newCount)})
          </button>
        </div>

        {stations.length > 0 && (
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="rounded-xl border px-3 py-1.5 text-xs bg-surface text-neutral-700 dark:text-neutral-300"
          >
            <option value="">All Stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                TAF {s.branchName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Feedback Items List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : feedbacks.length === 0 ? (
        <Card className="p-8 text-center rounded-3xl border border-dashed">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-2xl mb-3">
            💬
          </div>
          <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>
            No Feedback Found
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            {statusFilter !== "all" || stationFilter
              ? "No feedback matches the selected filters."
              : "When customers submit feedback or report issues from the Mini App, they will appear here."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((item) => {
            const isSaving = savingId === item.id;
            const isEditingNotes = editingNotesId === item.id;

            return (
              <Card
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  item.status === "NEW"
                    ? "bg-amber-500/[0.02] border-amber-500/20 shadow-xs"
                    : "bg-surface opacity-90"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: User / Metadata */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                      {item.name ? item.name.charAt(0).toUpperCase() : "👤"}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>
                          {item.name || "Anonymous Customer"}
                        </span>

                        {item.status === "NEW" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Resolved
                          </span>
                        )}

                        {item.station && (
                          <span className="rounded-lg bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                            📍 TAF {item.station.branchName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-1">
                        {item.contact && (
                          <span className="font-medium text-brand-orange">
                            {item.contact.startsWith("@") ? (
                              <a
                                href={`https://t.me/${item.contact.slice(1)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-amber-600"
                              >
                                {item.contact}
                              </a>
                            ) : (
                              item.contact
                            )}
                          </span>
                        )}
                        <span>
                          <RelativeTime value={item.createdAt} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Button
                      variant={item.status === "NEW" ? "default" : "outline"}
                      size="sm"
                      disabled={isSaving}
                      onClick={() => toggleStatus(item)}
                      className={`text-xs h-8 px-3 rounded-xl font-bold ${
                        item.status === "NEW"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "text-neutral-600 dark:text-neutral-300"
                      }`}
                    >
                      {item.status === "NEW" ? "✓ Mark Resolved" : "Reopen"}
                    </Button>
                    <button
                      disabled={isSaving}
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 transition-colors"
                      title="Delete feedback"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div
                  className="mt-3.5 rounded-xl p-3.5 text-xs leading-relaxed border"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {item.message}
                </div>

                {/* Admin Note Section */}
                <div className="mt-3 text-xs">
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Internal admin notes (e.g. Called customer, dispatched maintenance)..."
                        className="w-full rounded-xl border p-2.5 text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => saveNotes(item.id)}
                          className="h-7 text-[11px] rounded-lg bg-brand-orange text-neutral-900 font-bold"
                        >
                          Save Note
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNotesId(null)}
                          className="h-7 text-[11px] rounded-lg"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : item.adminNotes ? (
                    <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60">
                      <div>
                        <span className="font-semibold text-neutral-500 text-[10px] uppercase tracking-wider block mb-0.5">
                          Admin Note:
                        </span>
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {item.adminNotes}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingNotesId(item.id);
                          setNoteText(item.adminNotes || "");
                        }}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNotesId(item.id);
                        setNoteText("");
                      }}
                      className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      + Add admin note
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
