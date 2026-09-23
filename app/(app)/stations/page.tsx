"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FuelChips } from "@/components/customer/FuelChips";
import { PageHeader } from "@/components/customer/PageHeader";
import { StationCard } from "@/components/customer/StationCard";
import { useStations } from "@/components/customer/StationsProvider";
import { EmptyState, ErrorState, OfflineBanner, SafetyNote, StationListSkeleton } from "@/components/customer/StateViews";
import { filterAndSort } from "@/lib/stations/filter";

const RADII = [1, 3, 5, 10, 20];

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function FilterSlidersIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

function StationsList() {
  const t = useTranslations("stations");
  const tHome = useTranslations("home");
  const tErr = useTranslations("errors");
  const params = useSearchParams();
  const { status, error, stations, fuelTypes, location, requestLocation, refresh } = useStations();

  const [input, setInput] = useState(params.get("q") ?? "");
  const [q, setQ] = useState(input);
  const [showFilters, setShowFilters] = useState(false);
  const [fuel, setFuel] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  // Debounce typing so we don't re-filter on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(input), 250);
    return () => clearTimeout(id);
  }, [input]);

  const cities = useMemo(() => [...new Set(stations.map((s) => s.city))].sort(), [stations]);
  const areas = useMemo(
    () => [...new Set(stations.filter((s) => !city || s.city === city).map((s) => s.area).filter((a): a is string => !!a))].sort(),
    [stations, city],
  );

  const results = useMemo(
    () => filterAndSort(stations, { q, fuelSlug: fuel, availableOnly: availableOnly && !!fuel, radiusKm, city: city || null, area: area || null, openOnly }, location),
    [stations, q, fuel, availableOnly, radiusKm, city, area, openOnly, location],
  );

  const activeFilters = [fuel && availableOnly, radiusKm !== null, city, area, openOnly].filter(Boolean).length;
  const clear = () => {
    setFuel(null);
    setAvailableOnly(false);
    setRadiusKm(null);
    setCity("");
    setArea("");
    setOpenOnly(false);
  };

  const select = "min-h-[44px] w-full rounded-xl border px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-orange/40";
  const selStyle = { background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" };

  return (
    <main className="pb-12 max-w-lg mx-auto">
      <PageHeader title={t("title")} />
      <OfflineBanner />

      {/* Modern Search & Filter Controls */}
      <div className="px-4 pt-3 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input with Inside Icon */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tHome("searchPlaceholder")}
              maxLength={80}
              className="h-11 w-full rounded-2xl border pl-10 pr-9 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
              style={selStyle}
            />
            {input && (
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  setQ("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                aria-label="Clear search"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={`flex h-11 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs ${
              showFilters || activeFilters > 0
                ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-500/10"
            }`}
            style={!(showFilters || activeFilters > 0) ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
          >
            <FilterSlidersIcon className="h-4 w-4" />
            <span className="hidden xs:inline">{showFilters ? t("hideFilters") : t("filters")}</span>
            {activeFilters > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-black text-neutral-950">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Quick Filter One-Tap Pills on Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <button
            type="button"
            onClick={() => setOpenOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
              openOnly
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/5"
            }`}
            style={!openOnly ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${openOnly ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
            <span>{t("openOnly")}</span>
          </button>

          {fuelTypes.map((ft) => {
            const isSelected = fuel === ft.slug;
            return (
              <button
                key={ft.id}
                type="button"
                onClick={() => setFuel(isSelected ? null : ft.slug)}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                  isSelected
                    ? "border-brand-orange bg-brand-orange/15 text-brand-orange shadow-2xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-500/5"
                }`}
                style={!isSelected ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
              >
                <span>{ft.icon}</span>
                <span>{ft.nameEn}</span>
              </button>
            );
          })}

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 font-bold text-red-600 dark:text-red-400 transition whitespace-nowrap active:scale-95 cursor-pointer"
            >
              <CloseIcon className="h-3.5 w-3.5" />
              <span>{t("clear")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Modern Filter Drawer */}
      {showFilters && (
        <section
          className="mx-4 mt-3 space-y-4 rounded-3xl border p-5 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          aria-label={t("filters")}
        >
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t("fuel")}</p>
            <div className="-mx-2">
              <FuelChips fuelTypes={fuelTypes} value={fuel} onChange={setFuel} allowAny />
            </div>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-md accent-[var(--color-brand-orange)]"
                checked={availableOnly}
                disabled={!fuel}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />
              <span className={`text-xs font-medium ${fuel ? "text-neutral-800 dark:text-neutral-200" : "opacity-40"}`}>
                {t("availableOnly")}
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t("distance")}</span>
              <select
                className={select}
                style={selStyle}
                disabled={!location}
                value={radiusKm ?? ""}
                onChange={(e) => setRadiusKm(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t("anyDistance")}</option>
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {t("km", { km: r })}
                  </option>
                ))}
              </select>
            </label>
            {!location && (
              <p className="text-xs text-neutral-500">
                {t("needLocation")}{" "}
                <button
                  type="button"
                  onClick={() => void requestLocation()}
                  className="font-bold text-brand-orange underline cursor-pointer"
                >
                  {t("useMyLocation")}
                </button>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t("city")}</span>
              <select
                className={select}
                style={selStyle}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setArea("");
                }}
              >
                <option value="">{t("all")}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{t("area")}</span>
              <select
                className={select}
                style={selStyle}
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="">{t("all")}</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={clear}
              className="h-10 flex-1 rounded-xl border px-3 text-xs font-bold transition hover:bg-neutral-500/10 active:scale-95 cursor-pointer"
              style={{ borderColor: "var(--border)" }}
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="h-10 flex-1 rounded-xl bg-brand-orange px-3 text-xs font-black text-neutral-950 shadow-xs transition hover:brightness-105 active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </section>
      )}

      {/* Stations Results List */}
      <div className="mt-4 space-y-3">
        {status === "loading" && <StationListSkeleton />}
        {status === "error" && (
          <ErrorState
            message={error === "network" ? tErr("network") : tErr("server")}
            onRetry={() => void refresh()}
          />
        )}
        {status === "ready" && (
          <>
            <div className="flex items-center justify-between px-4 text-xs font-bold text-neutral-500">
              <span aria-live="polite">{t("results", { count: results.length })}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Network Active
              </span>
            </div>

            {results.length === 0 ? (
              <EmptyState
                icon="🔍"
                title={tErr("noStations")}
                action={
                  activeFilters > 0 ? (
                    <button
                      type="button"
                      onClick={clear}
                      className="min-h-11 rounded-xl border px-4 text-xs font-bold cursor-pointer"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {t("clear")}
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-3.5 px-4">
                {results.map((r) => (
                  <StationCard
                    key={r.station.id}
                    station={r.station}
                    distanceKm={r.distanceKm}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <SafetyNote />
    </main>
  );
}

export default function StationsPage() {
  return (
    <Suspense fallback={<StationListSkeleton />}>
      <StationsList />
    </Suspense>
  );
}
