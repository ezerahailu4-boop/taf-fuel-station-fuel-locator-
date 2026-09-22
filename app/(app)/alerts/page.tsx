"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/customer/PageHeader";
import { EmptyState } from "@/components/customer/StateViews";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/client/api";
import type { SubscriptionDTO, InAppNotificationDTO } from "@/types/notifications";

export default function AlertsPage() {
  const t = useTranslations("alerts");
  const c = useTranslations("common");
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<"subscriptions" | "history">("subscriptions");
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([]);
  const [notifications, setNotifications] = useState<InAppNotificationDTO[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoadingSubs(true);
      const res = await apiFetch<{ subscriptions: SubscriptionDTO[] }>("/api/subscriptions");
      setSubscriptions(res.subscriptions);
    } catch (err) {
      console.error("[alerts] Failed to fetch subscriptions:", err);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setLoadingNotifs(true);
      const res = await apiFetch<{ items: InAppNotificationDTO[]; total: number; unreadCount: number }>(
        "/api/notifications?page=1&pageSize=25"
      );
      setNotifications(res.items);
    } catch (err) {
      console.error("[alerts] Failed to fetch notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
    loadNotifications();
  }, [loadSubscriptions, loadNotifications]);

  async function handleDeleteSubscription(id: string) {
    try {
      setDeletingId(id);
      await apiFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("[alerts] Failed to delete subscription:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error(err);
    }
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <main className="space-y-4 pb-20">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Tabs */}
      <div className="px-4">
        <div className="flex rounded-2xl p-1 bg-neutral-200/60 dark:bg-neutral-800/60">
          <button
            type="button"
            onClick={() => setActiveTab("subscriptions")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "subscriptions"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <span>🔔</span>
            <span>{t("subscriptionsTab")}</span>
            {subscriptions.length > 0 && (
              <span className="ml-1 rounded-full bg-neutral-100 dark:bg-neutral-600 px-2 py-0.5 text-xs font-bold">
                {subscriptions.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === "history"
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <span>📜</span>
            <span>{t("historyTab")}</span>
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-orange px-2 py-0.5 text-xs font-bold text-neutral-900">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab: Subscriptions */}
      {activeTab === "subscriptions" && (
        <section className="px-4 space-y-3">
          <p className="text-xs text-neutral-500">
            {t("subscriptionsHint")}
          </p>

          {loadingSubs ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : subscriptions.length === 0 ? (
            <EmptyState
              icon="🔔"
              title={t("emptySubsTitle")}
              body={t("emptySubsBody")}
              action={
                <Link
                  href="/stations"
                  className="flex min-h-12 items-center justify-center rounded-xl bg-brand-orange px-5 font-semibold text-neutral-900"
                >
                  {t("browseStations")}
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {subscriptions.map((sub) => {
                const fuelName = locale === "am" ? sub.fuelType?.nameAm : sub.fuelType?.nameEn;
                return (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-3 rounded-2xl p-4 shadow-sm ring-1 ring-black/5"
                    style={{ background: "var(--surface)" }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sub.fuelType?.icon ?? "⛽"}</span>
                        <h3 className="font-bold text-base truncate">
                          {fuelName ?? "Fuel"}
                        </h3>
                      </div>
                      <p className="text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                        TAF {sub.station?.branchName ?? "Station"}
                        {sub.station?.area ? ` (${sub.station.area})` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.station?.id && (
                        <Link
                          href={`/stations/${sub.station.id}`}
                          className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          style={{ borderColor: "var(--border)" }}
                        >
                          {t("viewStation")}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSubscription(sub.id)}
                        disabled={deletingId === sub.id}
                        aria-label={t("remove")}
                        title={t("remove")}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                      >
                        {deletingId === sub.id ? "…" : "✕"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <section className="px-4 space-y-3">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-brand-orange hover:underline"
              >
                {t("markAllRead")}
              </button>
            </div>
          )}

          {loadingNotifs ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon="📭"
              title={t("emptyHistoryTitle")}
              body={t("emptyHistoryBody")}
            />
          ) : (
            <ul className="space-y-2.5">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => {
                    if (!n.readAt) handleMarkRead(n.id);
                  }}
                  className={`rounded-2xl p-4 shadow-sm ring-1 ring-black/5 transition-all ${
                    !n.readAt
                      ? "ring-2 ring-brand-orange/40 bg-amber-50/40 dark:bg-amber-950/20"
                      : ""
                  }`}
                  style={{ background: !n.readAt ? undefined : "var(--surface)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">🔔</span>
                      <h3 className="font-bold text-sm leading-snug">{n.title}</h3>
                    </div>
                    {!n.readAt && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-brand-orange mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    {n.body}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                    <RelativeTime value={n.createdAt} />
                    {n.stationId && (
                      <Link
                        href={`/stations/${n.stationId}`}
                        className="font-semibold text-brand-orange hover:underline"
                      >
                        {t("viewStation")} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
