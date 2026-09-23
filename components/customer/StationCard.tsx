"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import { formatDistance } from "@/lib/geo/haversine";
import type { StationDTO } from "@/types/stations";
import { DirectionsButton } from "./DirectionsButton";
import { FuelLine } from "./FuelLine";

function MapPinIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MapIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function StationCard({
  station,
  distanceKm,
  rank,
}: {
  station: StationDTO;
  distanceKm: number | null;
  rank?: number;
}) {
  const t = useTranslations("station");
  const c = useTranslations("common");
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank ? `${rank}.` : null;

  return (
    <article
      className="group relative flex flex-col justify-between space-y-3.5 rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-brand-orange/40 active:scale-[0.99]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
      aria-label={`TAF ${station.branchName}`}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {medal && <span aria-hidden className="text-sm">{medal}</span>}
            <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug text-neutral-900 dark:text-neutral-50">
              TAF {station.branchName}
            </h2>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <MapPinIcon className="h-3.5 w-3.5 text-brand-orange shrink-0" />
            <span className="truncate">{[station.area, station.city].filter(Boolean).join(", ")}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {distanceKm !== null && (
            <span className="inline-flex items-center rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-xs font-black text-brand-orange ring-1 ring-brand-orange/20">
              {formatDistance(distanceKm)}
            </span>
          )}
          <StationStatusBadge status={station.status} />
        </div>
      </header>

      {/* Fuel inventory status list */}
      <div className="rounded-xl border p-3 bg-neutral-500/5" style={{ borderColor: "var(--border)" }}>
        <ul className="space-y-2">
          {station.fuels.map((f) => (
            <FuelLine key={f.fuelTypeId} fuel={f} />
          ))}
        </ul>
      </div>

      {/* Last reported time */}
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {station.lastUpdated ? (
            <>
              {c("lastUpdated")}: <RelativeTime value={station.lastUpdated} />
            </>
          ) : (
            c("notReported")
          )}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/map?station=${station.id}`}
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all hover:bg-neutral-500/10 active:scale-95 shadow-2xs text-neutral-800 dark:text-neutral-200"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <MapIcon className="h-3.5 w-3.5 text-brand-orange" />
            <span>{t("viewOnMap")}</span>
          </Link>
          <Link
            href={`/stations/${station.id}`}
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all hover:bg-neutral-500/10 active:scale-95 shadow-2xs text-neutral-800 dark:text-neutral-200"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <InfoIcon className="h-3.5 w-3.5 text-blue-500" />
            <span>{t("details")}</span>
          </Link>
        </div>

        <DirectionsButton
          lat={station.latitude}
          lng={station.longitude}
          name={`TAF ${station.branchName}`}
        />
      </div>
    </article>
  );
}
