"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useStations } from "./StationsProvider";

export function EmptyState({ icon = "⛽", title, body, action }: { icon?: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-3xl p-8 text-center ring-1 ring-black/5" style={{ background: "var(--surface)" }}>
      <span aria-hidden className="text-4xl">{icon}</span>
      <h2 className="text-lg font-bold">{title}</h2>
      {body && <p style={{ color: "var(--muted)" }}>{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const c = useTranslations("common");
  return (
    <div role="alert" className="mx-4 space-y-3 rounded-3xl bg-red-100 p-5 text-red-900">
      <p className="font-medium">{message}</p>
      <button onClick={onRetry} className="min-h-12 rounded-xl bg-red-700 px-5 font-semibold text-white">
        {c("retry")}
      </button>
    </div>
  );
}

export function StationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-56" />
      ))}
    </div>
  );
}

/** Shown when the list on screen came from the local cache. */
export function OfflineBanner() {
  const { offlineSince, refresh } = useStations();
  const t = useTranslations("state");
  if (!offlineSince) return null;
  return (
    <div role="status" className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-100 px-4 py-3 text-amber-900">
      <p className="text-sm font-medium">
        📡 {t("offline")} <RelativeTime value={new Date(offlineSince)} />
      </p>
      <button onClick={() => void refresh()} className="min-h-10 shrink-0 rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white">
        {t("refresh")}
      </button>
    </div>
  );
}

export function SafetyNote() {
  const t = useTranslations("app");
  return <p className="px-6 pb-4 pt-2 text-center text-sm" style={{ color: "var(--muted)" }}>{t("disclaimer")}</p>;
}
