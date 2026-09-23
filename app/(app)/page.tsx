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

export default function HomePage() {
  const t = useTranslations("home");
  const tApp = useTranslations("app");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();
  const { status, error, stations, fuelTypes, selectedFuel, setSelectedFuel, location, refresh } = useStations();
  const [q, setQ] = useState("");

  useEffect(() => trackEvent({ event: "app_open" }), []);

  const recent = useMemo(
    () => [...stations].filter((s) => s.lastUpdated).sort((a, b) => (b.lastUpdated! > a.lastUpdated! ? 1 : -1)).slice(0, 3),
    [stations],
  );

  const fuelName = fuelTypes.find((f) => f.slug === selectedFuel);
  const goNearest = () => router.push("/nearest");

  return (
    <main className="pb-12 max-w-lg mx-auto">
      <PageHeader title={tApp("name")} subtitle={tApp("tagline")} />

      {/* Hero Spotlight: Nearest & Available Station */}
      <NearestStationSpotlight />

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

      {/* Fuel Types Quick Selection */}
      <div className="mt-5">
        <h2 className="mb-2 px-4 text-xs font-black uppercase tracking-wider text-neutral-500">
          {t("fuelTitle")}
        </h2>
        <FuelChips fuelTypes={fuelTypes} value={selectedFuel} onChange={setSelectedFuel} />
        {fuelName && (
          <div className="px-4 pt-3">
            <button
              onClick={goNearest}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-bold transition hover:bg-neutral-500/10 active:scale-95 cursor-pointer shadow-2xs"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <CompassIcon className="h-4 w-4 text-brand-orange" />
              <span>{t("findNearest", { fuel: locale === "am" ? fuelName.nameAm : fuelName.nameEn })}</span>
            </button>
          </div>
        )}
      </div>

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
