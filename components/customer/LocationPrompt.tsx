"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useStations } from "./StationsProvider";

/**
 * Friendly, explicit permission step. The browser/Telegram permission dialog only appears after the user taps "Allow".
 * If they refuse (or location is unavailable) they can pick an area instead, so location is never required.
 */
export function LocationPrompt({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("location");
  const e = useTranslations("errors");
  const { requestLocation, locationStatus, areas, setAreaLocation } = useStations();
  const [area, setArea] = useState("");

  const failed = locationStatus === "denied" || locationStatus === "unavailable";

  async function allow() {
    const loc = await requestLocation();
    if (loc) onDone?.();
  }

  return (
    <section className="mx-4 space-y-4 rounded-3xl p-6 shadow-sm ring-1 ring-black/5" style={{ background: "var(--surface)" }}>
      <div className="text-center">
        <span aria-hidden className="text-4xl">📍</span>
        <h2 className="mt-2 text-xl font-bold">{failed ? e("location") : t("promptTitle")}</h2>
        {!failed && <p className="mt-2" style={{ color: "var(--muted)" }}>{t("promptBody")}</p>}
      </div>

      <button onClick={() => void allow()} disabled={locationStatus === "asking"} className="min-h-14 w-full rounded-xl bg-brand-orange px-4 text-lg font-bold text-neutral-900 disabled:opacity-60">
        {locationStatus === "asking" ? t("asking") : failed ? t("tryAgain") : t("allow")}
      </button>

      <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">{t("manual")}</span>
          <select
            value={area}
            onChange={(ev) => {
              setArea(ev.target.value);
              if (ev.target.value) {
                setAreaLocation(ev.target.value);
                onDone?.();
              }
            }}
            className="min-h-12 w-full rounded-xl border px-3 text-base"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          >
            <option value="">{t("areaPlaceholder")}</option>
            {areas.map((a) => (
              <option key={a.label} value={a.label}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-center text-xs" style={{ color: "var(--muted)" }}>🔒 {t("privacy")}</p>
    </section>
  );
}
