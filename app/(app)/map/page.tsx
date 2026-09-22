"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FuelChips } from "@/components/customer/FuelChips";
import { MapView } from "@/components/customer/MapView";
import { PageHeader } from "@/components/customer/PageHeader";
import { useStations } from "@/components/customer/StationsProvider";
import { ErrorState, OfflineBanner } from "@/components/customer/StateViews";
import { Skeleton } from "@/components/ui/Skeleton";
import { haversineKm } from "@/lib/geo/haversine";

function MapScreen() {
  const t = useTranslations("map");
  const tErr = useTranslations("errors");
  const params = useSearchParams();
  const { status, error, stations, fuelTypes, location, refresh } = useStations();
  const [fuel, setFuel] = useState<string | null>(null);

  const items = useMemo(
    () => stations.map((s) => ({ station: s, distanceKm: location ? haversineKm(location, { lat: s.latitude, lng: s.longitude }) : null })),
    [stations, location],
  );

  return (
    <main className="flex flex-col">
      <PageHeader title={t("title")} />
      <OfflineBanner />
      <FuelChips fuelTypes={fuelTypes} value={fuel} onChange={setFuel} allowAny />
      <div className="mt-3 px-4">
        {status === "loading" && <Skeleton className="h-[calc(100dvh-16rem)]" />}
        {status === "error" && <ErrorState message={error === "network" ? tErr("network") : tErr("server")} onRetry={() => void refresh()} />}
        {status === "ready" && <MapView items={items} fuelSlug={fuel} user={location} focusId={params.get("station") ?? undefined} className="h-[calc(100dvh-16rem)] min-h-80 w-full" />}
        <p className="pt-2 text-center text-xs" style={{ color: "var(--muted)" }}>{t("legend")}</p>
      </div>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-96" />}>
      <MapScreen />
    </Suspense>
  );
}
