"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DirectionsButton } from "@/components/customer/DirectionsButton";
import { FuelLine } from "@/components/customer/FuelLine";
import { MapView } from "@/components/customer/MapView";
import { PageHeader } from "@/components/customer/PageHeader";
import { useStations } from "@/components/customer/StationsProvider";
import { EmptyState, OfflineBanner, SafetyNote } from "@/components/customer/StateViews";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { trackEvent } from "@/lib/client/analytics";
import { formatDistance, haversineKm } from "@/lib/geo/haversine";
import { openingHoursToday } from "@/lib/stations/hours";
import type { StationDTO } from "@/types/stations";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("station");
  const c = useTranslations("common");
  const tFuel = useTranslations("fuel");
  const { getStation, upsertStation, location, status } = useStations();
  const cached = getStation(id);
  const [missing, setMissing] = useState(false);

  // Deep links (or a cold start) may not have the station in memory yet: fetch it directly.
  useEffect(() => {
    if (cached || !UUID.test(id)) {
      if (!UUID.test(id)) setMissing(true);
      return;
    }
    apiFetch<StationDTO>(`/api/stations/${id}`)
      .then(upsertStation)
      .catch((e) => e instanceof ApiClientError && e.status === 404 && setMissing(true));
  }, [id, cached, upsertStation]);

  useEffect(() => {
    if (UUID.test(id)) trackEvent({ event: "station_view", stationId: id });
  }, [id]);

  const s = cached;
  if (!s) {
    return (
      <main>
        <PageHeader title="TAF" back={{ href: "/stations", label: t("backLabel") }} />
        {missing || status === "error" ? (
          <EmptyState icon="🔍" title={t("notFound")} action={<Link href="/stations" className="flex min-h-12 items-center rounded-xl bg-brand-orange px-5 font-semibold text-neutral-900">{t("back")}</Link>} />
        ) : (
          <div className="space-y-3 px-4"><Skeleton className="h-40" /><Skeleton className="h-48" /></div>
        )}
      </main>
    );
  }

  const distanceKm = location ? haversineKm(location, { lat: s.latitude, lng: s.longitude }) : null;
  const hours = openingHoursToday(s.openingHours, new Date());
  const hoursText =
    hours.kind === "24h" ? t("open24") : hours.kind === "ranges" ? hours.ranges.map(([a, b]) => `${a} – ${b}`).join(", ") : hours.kind === "closedToday" ? t("closedToday") : t("hoursUnknown");
  const anyStale = s.fuels.some((f) => f.isStale);
  const card = "rounded-3xl p-5 shadow-sm ring-1 ring-black/5";
  const row = "flex items-start justify-between gap-4 py-2";

  return (
    <main className="space-y-4">
      <PageHeader title={`TAF ${s.branchName}`} subtitle={[s.area, s.city].filter(Boolean).join(", ")} back={{ href: "/stations", label: t("backLabel") }} />
      <OfflineBanner />

      <section className={`mx-4 ${card}`} style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{s.name}</h2>
          <StationStatusBadge status={s.status} />
        </div>
        <dl className="mt-2 divide-y" style={{ borderColor: "var(--border)" }}>
          <div className={row}><dt className="text-sm" style={{ color: "var(--muted)" }}>📍 {t("address")}</dt><dd className="text-right font-medium">{s.address}{distanceKm !== null && <span className="block text-sm font-bold">{t("away", { distance: formatDistance(distanceKm) })}</span>}</dd></div>
          {s.phone && <div className={row}><dt className="text-sm" style={{ color: "var(--muted)" }}>☎️ {t("phone")}</dt><dd className="text-right"><a href={`tel:${s.phone.replace(/[^+\d]/g, "")}`} className="font-semibold underline">{s.phone}</a></dd></div>}
          <div className={row}><dt className="text-sm" style={{ color: "var(--muted)" }}>🕒 {t("hours")}</dt><dd className="text-right font-medium">{hoursText}</dd></div>
          {s.services.length > 0 && <div className={row}><dt className="text-sm" style={{ color: "var(--muted)" }}>🛠️ {t("services")}</dt><dd className="text-right font-medium">{s.services.join(" · ")}</dd></div>}
        </dl>
      </section>

      <section className={`mx-4 ${card}`} style={{ background: "var(--surface)" }}>
        <h2 className="mb-3 text-lg font-bold">{t("availability")}</h2>
        {anyStale && <p className="mb-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">⚠️ {tFuel("stale")}</p>}
        <ul className="space-y-3">{s.fuels.map((f) => <FuelLine key={f.fuelTypeId} fuel={f} stationId={s.id} showSubscribe showTime />)}</ul>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          {s.lastUpdated ? <>{c("lastUpdated")}: <RelativeTime value={s.lastUpdated} /></> : c("notReported")}
        </p>
      </section>

      <MapView items={[{ station: s, distanceKm }]} user={location} className="mx-4 h-56 w-[calc(100%-2rem)]" />

      <div className="grid grid-cols-2 gap-2 px-4">
        <Link href={`/map?station=${s.id}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 font-semibold" style={{ borderColor: "var(--border)" }}>
          🗺️ {t("viewOnMap")}
        </Link>
        <div><DirectionsButton lat={s.latitude} lng={s.longitude} name={`TAF ${s.branchName}`} /></div>
      </div>
      <SafetyNote />
    </main>
  );
}
