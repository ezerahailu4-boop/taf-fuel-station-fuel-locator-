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
    const id = setTimeout(() => setQ(input), 300);
    return () => clearTimeout(id);
  }, [input]);

  const cities = useMemo(() => [...new Set(stations.map((s) => s.city))].sort(), [stations]);
  const areas = useMemo(() => [...new Set(stations.filter((s) => !city || s.city === city).map((s) => s.area).filter((a): a is string => !!a))].sort(), [stations, city]);

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
  const select = "min-h-12 w-full rounded-xl border px-3 text-base";
  const selStyle = { background: "var(--bg)", borderColor: "var(--border)" };

  return (
    <main>
      <PageHeader title={t("title")} />
      <OfflineBanner />

      <div className="flex gap-2 px-4">
        <label className="flex-1">
          <span className="sr-only">{t("searchPlaceholder")}</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`🔎 ${tHome("searchPlaceholder")}`} maxLength={80} className="min-h-12 w-full rounded-xl border px-4 text-base" style={selStyle} />
        </label>
        <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="min-h-12 rounded-xl border px-4 font-semibold" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          ⚙️ {showFilters ? t("hideFilters") : t("filters")}
          {activeFilters > 0 && <span className="ml-1 rounded-full bg-brand-orange px-2 text-sm text-neutral-900">{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <section className="mx-4 mt-3 space-y-4 rounded-3xl p-5 ring-1 ring-black/5" style={{ background: "var(--surface)" }} aria-label={t("filters")}>
          <div className="space-y-2">
            <p className="text-sm font-semibold">{t("fuel")}</p>
            <div className="-mx-4">
              <FuelChips fuelTypes={fuelTypes} value={fuel} onChange={setFuel} allowAny />
            </div>
            <label className="flex min-h-12 items-center gap-3">
              <input type="checkbox" className="h-6 w-6 accent-[var(--color-brand-orange)]" checked={availableOnly} disabled={!fuel} onChange={(e) => setAvailableOnly(e.target.checked)} />
              <span className={fuel ? "" : "opacity-50"}>{t("availableOnly")}</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">{t("distance")}</span>
              <select className={select} style={selStyle} disabled={!location} value={radiusKm ?? ""} onChange={(e) => setRadiusKm(e.target.value ? Number(e.target.value) : null)}>
                <option value="">{t("anyDistance")}</option>
                {RADII.map((r) => (
                  <option key={r} value={r}>{t("km", { km: r })}</option>
                ))}
              </select>
            </label>
            {!location && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t("needLocation")}{" "}
                <button onClick={() => void requestLocation()} className="font-semibold underline">{t("useMyLocation")}</button>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">{t("city")}</span>
              <select className={select} style={selStyle} value={city} onChange={(e) => { setCity(e.target.value); setArea(""); }}>
                <option value="">{t("all")}</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold">{t("area")}</span>
              <select className={select} style={selStyle} value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">{t("all")}</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>

          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" className="h-6 w-6 accent-[var(--color-brand-orange)]" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
            <span>{t("openOnly")}</span>
          </label>

          <button onClick={clear} className="min-h-11 w-full rounded-xl border px-4 font-semibold" style={{ borderColor: "var(--border)" }}>{t("clear")}</button>
        </section>
      )}

      <div className="mt-4 space-y-3">
        {status === "loading" && <StationListSkeleton />}
        {status === "error" && <ErrorState message={error === "network" ? tErr("network") : tErr("server")} onRetry={() => void refresh()} />}
        {status === "ready" && (
          <>
            <p className="px-4 text-sm font-semibold" style={{ color: "var(--muted)" }} aria-live="polite">{t("results", { count: results.length })}</p>
            {results.length === 0 ? (
              <EmptyState icon="🔍" title={tErr("noStations")} action={activeFilters > 0 ? <button onClick={clear} className="min-h-11 rounded-xl border px-4 font-semibold" style={{ borderColor: "var(--border)" }}>{t("clear")}</button> : undefined} />
            ) : (
              <div className="grid gap-3 px-4 md:grid-cols-2">
                {results.map((r) => (
                  <StationCard key={r.station.id} station={r.station} distanceKm={r.distanceKm} />
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
