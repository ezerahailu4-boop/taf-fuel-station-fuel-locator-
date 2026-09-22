"use client";

import { useTranslations } from "next-intl";
import { directionsLinks } from "@/lib/directions";
import { openExternal } from "@/lib/client/external";

/** Primary "Get directions" (Google Maps) with alternatives for other navigation apps. */
export function DirectionsButton({ lat, lng, name, className = "" }: { lat: number; lng: number; name?: string; className?: string }) {
  const t = useTranslations("station");
  const links = directionsLinks(lat, lng, name);
  const [primary, ...others] = links;
  return (
    <div className={className}>
      <a
        href={primary!.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          openExternal(primary!.url);
        }}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 font-semibold text-neutral-900"
      >
        <span aria-hidden>🧭</span>
        {t("directions")}
      </a>
      <details className="mt-1 text-center text-sm">
        <summary className="cursor-pointer select-none py-2" style={{ color: "var(--muted)" }}>{t("moreApps")}</summary>
        <div className="flex flex-wrap justify-center gap-2 pb-1">
          {others.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (l.url.startsWith("http")) { e.preventDefault(); openExternal(l.url); } }} className="min-h-10 rounded-lg border px-3 py-2" style={{ borderColor: "var(--border)" }}>
              {l.label}
            </a>
          ))}
        </div>
      </details>
    </div>
  );
}
