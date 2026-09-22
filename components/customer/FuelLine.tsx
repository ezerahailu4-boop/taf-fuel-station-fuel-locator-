"use client";

import { useLocale, useTranslations } from "next-intl";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { FuelStatusBadge } from "@/components/ui/StatusBadge";
import type { StationFuelDTO } from "@/types/stations";

import { SubscribeButton } from "./SubscribeButton";

export function FuelLine({
  fuel,
  stationId,
  showTime = false,
  showSubscribe = false,
}: {
  fuel: StationFuelDTO;
  stationId?: string;
  showTime?: boolean;
  showSubscribe?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("fuel");
  const c = useTranslations("common");
  const name = locale === "am" ? fuel.nameAm : fuel.nameEn;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="flex items-center gap-2 font-semibold">
        <span aria-hidden>{fuel.icon} </span>
        {name}
        {showSubscribe && stationId && (
          <SubscribeButton
            stationId={stationId}
            fuelTypeId={fuel.fuelTypeId}
            compact
          />
        )}
      </span>
      <span className="flex flex-col items-end gap-0.5">
        <FuelStatusBadge status={fuel.status} />
        {(showTime || fuel.isStale) && (
          <span className={`text-xs ${fuel.isStale ? "font-semibold text-amber-800 dark:text-amber-300" : ""}`} style={fuel.isStale ? undefined : { color: "var(--muted)" }}>
            {fuel.isStale && <span aria-hidden>⚠️ </span>}
            {fuel.isStale ? `${t("stale")} · ` : ""}
            {fuel.lastUpdated ? <RelativeTime value={fuel.lastConfirmedAt && fuel.lastConfirmedAt > fuel.lastUpdated ? fuel.lastConfirmedAt : fuel.lastUpdated} /> : c("notReported")}
          </span>
        )}
      </span>
    </li>
  );
}
