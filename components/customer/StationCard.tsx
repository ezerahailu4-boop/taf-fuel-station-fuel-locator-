"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import { formatDistance } from "@/lib/geo/haversine";
import type { StationDTO } from "@/types/stations";
import { DirectionsButton } from "./DirectionsButton";
import { FuelLine } from "./FuelLine";

export function StationCard({ station, distanceKm, rank }: { station: StationDTO; distanceKm: number | null; rank?: number }) {
  const t = useTranslations("station");
  const c = useTranslations("common");
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank ? `${rank}.` : null;

  return (
    <article className="space-y-3 rounded-3xl p-5 shadow-sm ring-1 ring-black/5" style={{ background: "var(--surface)" }} aria-label={`TAF ${station.branchName}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-snug">
            {medal && <span aria-hidden className="mr-1">{medal}</span>}
            TAF {station.branchName}
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            <span aria-hidden>📍 </span>
            {[station.area, station.city].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {distanceKm !== null && <span className="rounded-full bg-black/5 px-3 py-1 text-sm font-bold dark:bg-white/10">{t("away", { distance: formatDistance(distanceKm) })}</span>}
          {station.status !== "OPEN" && <StationStatusBadge status={station.status} />}
        </div>
      </header>

      <ul className="space-y-2.5">
        {station.fuels.map((f) => (
          <FuelLine key={f.fuelTypeId} fuel={f} />
        ))}
      </ul>

      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {station.lastUpdated ? (
          <>
            {c("lastUpdated")}: <RelativeTime value={station.lastUpdated} />
          </>
        ) : (
          c("notReported")
        )}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/map?station=${station.id}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
          <span aria-hidden>🗺️</span>
          {t("viewOnMap")}
        </Link>
        <Link href={`/stations/${station.id}`} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
          <span aria-hidden>📋</span>
          {t("details")}
        </Link>
      </div>
      <DirectionsButton lat={station.latitude} lng={station.longitude} name={`TAF ${station.branchName}`} />
    </article>
  );
}
