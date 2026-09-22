"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatDistance, haversineKm } from "@/lib/geo/haversine";
import { openExternal } from "@/lib/client/external";
import { directionsLinks } from "@/lib/directions";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { StationDTO } from "@/types/stations";
import { useStations } from "./StationsProvider";

export function NearestStationSpotlight() {
  const t = useTranslations("station");
  const c = useTranslations("common");
  const locale = useLocale();
  const { stations, location, locationStatus, requestLocation, status } = useStations();

  const nearest = useMemo(() => {
    if (stations.length === 0) return null;
    if (!location) {
      return stations.find((s) => s.status === "OPEN") ?? stations[0] ?? null;
    }
    const withDist = stations.map((s) => ({
      station: s,
      dist: haversineKm(location, { lat: s.latitude, lng: s.longitude }),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    const openWithFuel = withDist.find(
      (x) => x.station.status === "OPEN" && x.station.fuels.some((f) => f.status === "AVAILABLE" || f.status === "LIMITED"),
    );
    return openWithFuel ? openWithFuel.station : withDist[0]?.station ?? null;
  }, [stations, location]);

  const distanceKm = useMemo(() => {
    if (!location || !nearest) return null;
    return haversineKm(location, { lat: nearest.latitude, lng: nearest.longitude });
  }, [location, nearest]);

  if (status === "loading" || !nearest) return null;

  const directions = directionsLinks(nearest.latitude, nearest.longitude, `TAF ${nearest.branchName}`);
  const primaryNav = directions[0]?.url;

  return (
    <section className="relative mx-4 mt-3 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 p-5 shadow-lg backdrop-blur-md transition-all dark:from-neutral-900/90 dark:via-neutral-900/95 dark:to-neutral-900/90 dark:border-amber-500/30">
      {/* Decorative ambient glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Nearest & Available
          </span>
        </div>

        {/* GPS Badge / Auto-Detect Button */}
        {location ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>📍</span>
            <span>{formatDistance(distanceKm!)} away</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void requestLocation()}
            disabled={locationStatus === "asking"}
            className="group inline-flex items-center gap-1.5 rounded-full bg-brand-orange/20 px-3 py-1 text-xs font-bold text-neutral-900 transition hover:bg-brand-orange/30 active:scale-95 dark:text-amber-300"
          >
            <span>{locationStatus === "asking" ? "📡" : "📍"}</span>
            <span>{locationStatus === "asking" ? "Detecting GPS…" : "Detect my distance"}</span>
          </button>
        )}
      </div>

      {/* Station Main Info */}
      <div className="relative z-10 mt-3 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 dark:bg-neutral-800">
          <Image src="/brand/taf-logo.webp" alt="TAF" width={32} height={32} className="object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            TAF {nearest.branchName}
          </h2>
          <p className="line-clamp-1 text-xs text-neutral-600 dark:text-neutral-400">
            {nearest.address}
          </p>
        </div>
      </div>

      {/* Live Fuels Grid */}
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
        {nearest.fuels.map((fuel) => {
          const isAvail = fuel.status === "AVAILABLE";
          const isLimited = fuel.status === "LIMITED";
          return (
            <div
              key={fuel.fuelTypeId}
              className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 transition-all ${
                isAvail
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                  : isLimited
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200"
                    : "border-red-500/20 bg-red-500/5 text-neutral-500"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{fuel.icon || "⛽"}</span>
                <span className="text-sm font-bold">{locale === "am" ? fuel.nameAm : fuel.nameEn}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold tracking-wide uppercase ${
                  isAvail
                    ? "bg-emerald-600 text-white"
                    : isLimited
                      ? "bg-amber-500 text-neutral-900"
                      : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                }`}
              >
                {isAvail ? "Available" : isLimited ? "Limited" : "Out"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Freshness / Status Meta */}
      <div className="relative z-10 mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {nearest.lastUpdated ? (
            <>
              {c("lastUpdated")}: <RelativeTime value={nearest.lastUpdated} />
            </>
          ) : (
            "Status live"
          )}
        </span>
        {nearest.phone && (
          <a
            href={`tel:${nearest.phone}`}
            className="flex items-center gap-1 font-semibold text-neutral-800 transition hover:underline dark:text-neutral-200"
          >
            <span>📞</span>
            <span>{nearest.phone}</span>
          </a>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
        {primaryNav && (
          <button
            type="button"
            onClick={() => openExternal(primaryNav)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-orange px-4 text-sm font-extrabold text-neutral-900 shadow-sm transition hover:brightness-105 active:scale-95"
          >
            <span>🧭</span>
            <span>{t("directions")}</span>
          </button>
        )}
        <Link
          href={`/map?station=${nearest.id}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white/80 px-4 text-sm font-extrabold text-neutral-900 shadow-sm backdrop-blur-sm transition hover:bg-white active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        >
          <span>🗺️</span>
          <span>{t("viewOnMap")}</span>
        </Link>
      </div>
    </section>
  );
}
