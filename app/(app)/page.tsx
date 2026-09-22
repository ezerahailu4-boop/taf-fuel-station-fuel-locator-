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
    <main className="pb-8">
      <PageHeader title={tApp("name")} subtitle={tApp("tagline")} />

      {/* Hero Spotlight: Nearest & Available Station */}
      <NearestStationSpotlight />

      <section className="mx-4 mt-3 space-y-3 rounded-3xl p-4 shadow-sm ring-1 ring-black/5" style={{ background: "var(--surface)" }}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/stations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
          }}
          className="flex gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">{t("search")}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`🔎 ${t("searchPlaceholder")}`}
              maxLength={80}
              className="min-h-12 w-full rounded-2xl border px-4 text-sm"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
          </label>
          <button className="min-h-12 rounded-2xl border px-4 text-sm font-bold" style={{ borderColor: "var(--border)" }}>
            {t("search")}
          </button>
        </form>
      </section>

      <h2 className="mb-2 mt-5 px-4 text-lg font-bold">{t("fuelTitle")}</h2>
      <FuelChips fuelTypes={fuelTypes} value={selectedFuel} onChange={setSelectedFuel} />
      {fuelName && (
        <div className="px-4 pt-3">
          <button onClick={goNearest} className="min-h-12 w-full rounded-xl border px-4 font-semibold" style={{ borderColor: "var(--border)" }}>
            ⛽ {t("findNearest", { fuel: locale === "am" ? fuelName.nameAm : fuelName.nameEn })}
          </button>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between px-4">
          <h2 className="text-lg font-bold">{t("recent")}</h2>
          <Link href="/stations" className="text-sm font-semibold underline">{t("viewAll")}</Link>
        </div>
        <OfflineBanner />
        {status === "loading" && <StationListSkeleton count={2} />}
        {status === "error" && <ErrorState message={error === "network" ? tErr("network") : tErr("server")} onRetry={() => void refresh()} />}
        {status === "ready" && (
          <div className="grid gap-3 px-4 md:grid-cols-2">
            {recent.map((s) => (
              <StationCard key={s.id} station={s} distanceKm={location ? haversineKm(location, { lat: s.latitude, lng: s.longitude }) : null} />
            ))}
          </div>
        )}
      </div>
      <SafetyNote />
    </main>
  );
}
