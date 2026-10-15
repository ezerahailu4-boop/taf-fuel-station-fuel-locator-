"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FuelChips } from "@/components/customer/FuelChips";
import { NearestStationSpotlight } from "@/components/customer/NearestStationSpotlight";
import { PageHeader } from "@/components/customer/PageHeader";
import { StationCard } from "@/components/customer/StationCard";
import { useStations } from "@/components/customer/StationsProvider";
import { ErrorState, OfflineBanner, SafetyNote, StationListSkeleton } from "@/components/customer/StateViews";
import { trackEvent } from "@/lib/client/analytics";
import { haversineKm } from "@/lib/geo/haversine";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { FuelTypeRow } from "@/types/stations";

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CompassIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

const FALLBACK_FUELS: FuelTypeRow[] = [
  { id: "f-benzine", slug: "benzine", nameEn: "Benzine", nameAm: "ቤንዚን", icon: "⛽", isActive: true, displayOrder: 1 },
  { id: "f-diesel", slug: "diesel", nameEn: "Diesel", nameAm: "ናፍጣ", icon: "⛽", isActive: true, displayOrder: 2 },
];

export default function HomePage() {
  const t = useTranslations("home");
  const tApp = useTranslations("app");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();
  const { status, error, stations, fuelTypes, selectedFuel, setSelectedFuel, location, refresh } = useStations();
  const [q, setQ] = useState("");

  useEffect(() => trackEvent({ event: "app_open" }), []);

  // Sync with ?fuel= URL parameter (e.g. from Telegram bot direct links)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("fuel");
      if (p) setSelectedFuel(p);
    }
  }, [setSelectedFuel]);

  const effectiveFuels = useMemo(() => {
    const active = fuelTypes.filter((f) => f.isActive !== false);
    return active.length > 0 ? active : FALLBACK_FUELS;
  }, [fuelTypes]);

  const recent = useMemo(
    () => [...stations].filter((s) => s.lastUpdated).sort((a, b) => (b.lastUpdated! > a.lastUpdated! ? 1 : -1)).slice(0, 3),
    [stations],
  );

  const handleFuelSelect = (slug: string) => {
    setSelectedFuel(slug);
    router.push(`/nearest?fuel=${slug}`);
  };

  return (
    <main className="pb-12 max-w-lg mx-auto">
      {/* Commented out per request: TAF Nedaj ale / Find fuel availability near you.
      <PageHeader title={tApp("name")} subtitle={tApp("tagline")} />
      */}
      <PageHeader />

      {/* Top of Mini App: Which fuel do you need? (Compact & sleek) */}
      <section className="px-4 mt-2">
        <div
          className="rounded-2xl border px-3 py-2.5 shadow-2xs transition-all"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-brand-orange" />
              <span>{t("fuelTitle")}</span>
            </h2>
            {selectedFuel && (
              <button
                type="button"
                onClick={() => setSelectedFuel(null)}
                className="text-[10px] font-bold text-brand-orange hover:underline cursor-pointer"
              >
                {locale === "am" ? "ሁሉንም አሳይ" : "Reset"}
              </button>
            )}
          </div>

          {/* ⛽ Benzine & ⛽ Diesel Quick Select Cards - Automatically shows nearest */}
          <div className="grid grid-cols-2 gap-2">
            {effectiveFuels.map((f) => {
              const active = selectedFuel === f.slug;
              return (
                <button
                  key={f.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleFuelSelect(f.slug)}
                  className={`group relative flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-center transition-all duration-150 active:scale-95 cursor-pointer border ${
                    active
                      ? "bg-gradient-to-br from-amber-400 via-brand-orange to-orange-500 text-neutral-950 border-amber-400 shadow-xs ring-1 ring-brand-orange/40"
                      : "border-neutral-200/80 dark:border-neutral-800 hover:border-brand-orange/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  }`}
                  style={active ? undefined : { background: "var(--bg)", color: "var(--text)" }}
                >
                  <span className="text-lg shrink-0" aria-hidden>⛽</span>
                  <div className="min-w-0 text-left leading-none">
                    <span className="block text-xs sm:text-sm font-black tracking-tight leading-tight truncate">
                      {locale === "am" ? f.nameAm : f.nameEn}
                    </span>
                    <span
                      className={`block text-[9px] font-medium leading-none mt-0.5 truncate ${
                        active ? "text-neutral-900/80" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {locale === "am" ? f.nameEn : f.nameAm}
                    </span>
                  </div>
                  {active && (
                    <span className="ml-auto flex h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hero Spotlight: Nearest & Available Station */}
      <ErrorBoundary>
        <NearestStationSpotlight />
      </ErrorBoundary>

      {/* Modern Search Bar */}
      <section className="px-4 mt-3">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/stations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              maxLength={80}
              className="h-11 w-full rounded-2xl border pl-10 pr-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-2xl bg-brand-orange px-4 text-xs font-black text-neutral-950 shadow-xs transition hover:brightness-105 active:scale-95 cursor-pointer"
          >
            {t("search")}
          </button>
        </form>
      </section>

      {/* Recent Stations Activity */}
      <div className="mt-6">
        <div className="mb-2.5 flex items-center justify-between px-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500">
            {t("recent")}
          </h2>
          <Link
            href="/stations"
            className="text-xs font-bold text-brand-orange hover:underline transition"
          >
            {t("viewAll")} →
          </Link>
        </div>

        <OfflineBanner />
        {status === "loading" && <StationListSkeleton count={2} />}
        {status === "error" && (
          <ErrorState
            message={error === "network" ? tErr("network") : tErr("server")}
            onRetry={() => void refresh()}
          />
        )}
        {status === "ready" && (
          <div className="grid gap-3.5 px-4">
            {recent.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                distanceKm={location ? haversineKm(location, { lat: s.latitude, lng: s.longitude }) : null}
              />
            ))}
          </div>
        )}
      </div>

      <SafetyNote />
    </main>
  );
}
