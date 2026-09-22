"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { InAppNotificationDTO } from "@/types/notifications";

export function NotificationCenter() {
  const t = useTranslations("alerts");
  const c = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{
        items: InAppNotificationDTO[];
        total: number;
        unreadCount: number;
      }>("/api/notifications?page=1&pageSize=15");
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Offline or guest
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000); // 1-minute poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleMarkRead(id: string) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
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
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          fetchNotifications();
        }}
        aria-label={t("notificationsTitle")}
        className="relative flex min-h-10 min-w-10 items-center justify-center rounded-xl border transition-all active:scale-95"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-neutral-900 shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over / Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div
            className="flex h-full w-full max-w-sm flex-col shadow-2xl"
            style={{ background: "var(--surface)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-4 py-3.5"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <h2 className="font-bold">{t("notificationsTitle")}</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-xs font-bold text-brand-orange">
                    {unreadCount} {t("new")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Actions Bar */}
            {unreadCount > 0 && (
              <div
                className="flex items-center justify-end border-b px-4 py-2 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="font-medium text-brand-orange hover:underline"
                >
                  {t("markAllRead")}
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500">{c("loading")}</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-3xl mb-2">🔕</div>
                  <p className="font-medium">{t("noNotifications")}</p>
                  <p className="text-xs text-neutral-500 mt-1">{t("noNotificationsHint")}</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.readAt) handleMarkRead(n.id);
                    }}
                    className={`p-4 transition-colors ${
                      !n.readAt
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-tight">{n.title}</h3>
                      {!n.readAt && (
                        <span className="h-2 w-2 rounded-full bg-brand-orange shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {n.body}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
                      <RelativeTime value={n.createdAt} />
                      {n.stationId && (
                        <Link
                          href={`/stations/${n.stationId}`}
                          onClick={() => setOpen(false)}
                          className="font-medium text-brand-orange hover:underline"
                        >
                          {t("viewStation")} →
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-3 text-center" style={{ borderColor: "var(--border)" }}>
              <Link
                href="/alerts"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-brand-orange hover:underline"
              >
                {t("manageAlertsLink")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
