"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { FuelChips } from "@/components/customer/FuelChips";
import { LocationPrompt } from "@/components/customer/LocationPrompt";
import { PageHeader } from "@/components/customer/PageHeader";
import { StationCard } from "@/components/customer/StationCard";
import { useStations } from "@/components/customer/StationsProvider";
import { EmptyState, ErrorState, OfflineBanner, SafetyNote, StationListSkeleton } from "@/components/customer/StateViews";
import { ApiClientError, apiFetch, NetworkError } from "@/lib/client/api";
import { trackEvent } from "@/lib/client/analytics";
import type { NearbyResponse } from "@/services/nearbyService";

type Search = { status: "idle" } | { status: "loading" } | { status: "error"; kind: "network" | "server" } | { status: "done"; data: NearbyResponse };

export default function NearestPage() {
  const t = useTranslations("nearest");
  const tLoc = useTranslations("location");
  const tHome = useTranslations("home");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const { fuelTypes, selectedFuel, setSelectedFuel, location, clearLocation } = useStations();
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [nonce, setNonce] = useState(0);

  // Default to the first fuel type so a result is always shown once a location is known.
  const fuel = selectedFuel ?? fuelTypes[0]?.slug ?? null;
  useEffect(() => {
    if (!selectedFuel && fuelTypes[0]) setSelectedFuel(fuelTypes[0].slug);
  }, [selectedFuel, fuelTypes, setSelectedFuel]);

  useEffect(() => {
    if (!location || !fuel) return;
    const ctrl = new AbortController();
    setSearch({ status: "loading" });
    // POST so coordinates never appear in a URL. The response is not cached.
    apiFetch<NearbyResponse>("/api/stations/nearby", { method: "POST", body: { lat: location.lat, lng: location.lng, fuel, limit: 20 }, signal: ctrl.signal })
      .then((data) => setSearch({ status: "done", data }))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSearch({ status: "error", kind: e instanceof NetworkError ? "network" : e instanceof ApiClientError ? "server" : "server" });
      });
    trackEvent({ event: "fuel_search", fuelSlug: fuel });
    return () => ctrl.abort();
  }, [location, fuel, nonce]);

  const fuelRow = fuelTypes.find((f) => f.slug === fuel);
  const fuelLabel = fuelRow ? (locale === "am" ? fuelRow.nameAm : fuelRow.nameEn) : "";

  const available = search.status === "done" ? search.data.items.filter((i) => i.fuelMatch === "available") : [];
  const others = search.status === "done" ? search.data.items.filter((i) => i.fuelMatch !== "available") : [];

  return (
    <main>
      <PageHeader title={t("title")} />
      <OfflineBanner />
      <p className="mb-2 px-4 text-sm font-semibold">{t("fuelLabel")}</p>
      <FuelChips fuelTypes={fuelTypes} value={fuel} onChange={setSelectedFuel} />

      <div className="mt-4 space-y-4">
        {!location && <LocationPrompt />}

        {location && (
          <div className="mx-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-black/5" style={{ background: "var(--surface)" }}>
            <p className="text-sm font-medium">📍 {location.source === "gps" ? tLoc("usingGps") : tLoc("usingArea", { area: location.label ?? "" })}</p>
            <button onClick={clearLocation} className="min-h-10 rounded-lg border px-3 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
              {tLoc("change")}
            </button>
          </div>
        )}

        {location && search.status === "loading" && (
          <>
            <p className="px-4 font-medium" style={{ color: "var(--muted)" }}>{t("searching")}</p>
            <StationListSkeleton count={2} />
          </>
        )}
        {location && search.status === "error" && <ErrorState message={search.kind === "network" ? tErr("network") : tErr("server")} onRetry={() => setNonce((n) => n + 1)} />}

        {location && search.status === "done" && (
          <>
            {search.data.items.length === 0 && <EmptyState icon="🔍" title={tErr("noStations")} />}

            {search.data.items.length > 0 && available.length === 0 && (
              <p role="status" className="mx-4 rounded-2xl bg-amber-100 px-4 py-3 font-medium text-amber-900">⚠️ {tErr("noFuel")}</p>
            )}

            {available.length > 0 && (
              <section className="space-y-3">
                <h2 className="px-4 text-lg font-bold">{t("nearestAvailable", { fuel: fuelLabel })}</h2>
                <div className="grid gap-3 px-4 md:grid-cols-2">
                  {available.map((r, i) => (
                    <StationCard key={r.station.id} station={r.station} distanceKm={r.distanceKm} rank={i + 1} />
                  ))}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section className="space-y-3">
                <h2 className="px-4 text-lg font-bold" style={{ color: "var(--muted)" }}>{t("notAvailable")}</h2>
                <div className="grid gap-3 px-4 opacity-90 md:grid-cols-2">
                  {others.map((r) => (
                    <StationCard key={r.station.id} station={r.station} distanceKm={r.distanceKm} />
                  ))}
                </div>
              </section>
            )}

            <div className="px-4">
              <button onClick={() => setNonce((n) => n + 1)} className="min-h-12 w-full rounded-xl border px-4 font-semibold" style={{ borderColor: "var(--border)" }}>
                ↻ {t("refresh")}
              </button>
            </div>
          </>
        )}
      </div>
      <p className="sr-only">{tHome("fuelTitle")}</p>
      <SafetyNote />
    </main>
  );
}
