"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { openExternal } from "@/lib/client/external";
import type { LatLng } from "@/lib/geo/haversine";
import { loadMapProvider } from "@/lib/map";
import type { MapController, MapMarkerSpec } from "@/lib/map/types";
import { stationToneForFuel, TONE_GLYPH } from "@/lib/stations/tone";
import type { StationDTO } from "@/types/stations";
import { buildStationPopup } from "./popup";

const ADAMA_REST_STOP: LatLng = { lat: 8.751643, lng: 39.0160711 };

export function MapView({
  items,
  fuelSlug = null,
  user = null,
  focusId,
  className = "h-full min-h-72 w-full",
}: {
  items: Array<{ station: StationDTO; distanceKm: number | null }>;
  fuelSlug?: string | null;
  user?: LatLng | null;
  focusId?: string;
  className?: string;
}) {
  const t = useTranslations("map");
  const tStation = useTranslations("station");
  const tFuel = useTranslations("fuel.status");
  const tApp = useTranslations("app");
  const locale = useLocale();
  const router = useRouter();

  const host = useRef<HTMLDivElement>(null);
  const ctrl = useRef<MapController | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // Mount once. The map library is loaded lazily, only when a map is actually shown.
  useEffect(() => {
    let cancelled = false;
    let controller: MapController | null = null;
    (async () => {
      try {
        const provider = await loadMapProvider();
        if (cancelled || !host.current) return;
        controller = await provider.mount(host.current, { center: ADAMA_REST_STOP, zoom: 14 });
        if (cancelled) return controller.destroy();
        ctrl.current = controller;
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      ctrl.current = null;
      controller?.destroy();
    };
  }, []);

  const markers = useMemo<MapMarkerSpec[]>(
    () =>
      items.map(({ station, distanceKm }) => {
        const tone = stationToneForFuel(station, fuelSlug);
        return {
          id: station.id,
          lat: station.latitude,
          lng: station.longitude,
          tone,
          glyph: TONE_GLYPH[tone],
          label: `TAF ${station.branchName}, ${t(`tone.${tone}`)}`,
          renderPopup: () =>
            buildStationPopup(
              station,
              distanceKm,
              {
                distanceAway: (d) => tStation("away", { distance: d }),
                viewDetails: t("viewDetails"),
                directions: tStation("directions"),
                disclaimer: tApp("disclaimer"),
                status: (s) => tFuel(s as "AVAILABLE"),
                fuelName: (f) => (locale === "am" ? f.nameAm : f.nameEn),
              },
              { onDetails: (id) => router.push(`/stations/${id}`), onDirections: openExternal },
            ),
        };
      }),
    [items, fuelSlug, locale, router, t, tStation, tFuel, tApp],
  );

  const fitted = useRef(false);
  useEffect(() => {
    if (state !== "ready" || !ctrl.current) return;
    ctrl.current.setMarkers(markers, { fit: !fitted.current && markers.length > 0 });
    if (markers.length > 0) fitted.current = true;
    if (focusId) ctrl.current.focus(focusId);
  }, [state, markers, focusId]);

  useEffect(() => {
    if (state === "ready") ctrl.current?.setUserLocation(user);
  }, [state, user]);

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      <div ref={host} className="absolute inset-0" role="region" aria-label={t("title")} />
      {state === "loading" && <Skeleton className="absolute inset-0 !rounded-3xl" />}
      {state === "error" && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-red-100 p-6 text-center text-red-900">
          {t("unavailable")}
        </div>
      )}
    </div>
  );
}
