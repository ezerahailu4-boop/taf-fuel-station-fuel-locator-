"use client";

import { useTranslations } from "next-intl";
import { directionsLinks } from "@/lib/directions";
import { openExternal } from "@/lib/client/external";

function NavigationIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

/** Primary "Get directions" (Google Maps) with alternatives for other navigation apps. */
export function DirectionsButton({
  lat,
  lng,
  name,
  className = "",
}: {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
}) {
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
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-orange to-amber-500 px-4 text-xs font-black text-neutral-950 shadow-xs transition-all hover:brightness-105 active:scale-95 cursor-pointer"
      >
        <NavigationIcon className="h-4 w-4" />
        <span>{t("directions")}</span>
      </a>

      {others.length > 0 && (
        <details className="group mt-1 text-center text-xs">
          <summary
            className="cursor-pointer select-none py-1.5 font-medium transition text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          >
            {t("moreApps")}
          </summary>
          <div className="flex flex-wrap justify-center gap-1.5 pt-1 pb-1">
            {others.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (l.url.startsWith("http")) {
                    e.preventDefault();
                    openExternal(l.url);
                  }
                }}
                className="inline-flex min-h-[34px] items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:bg-neutral-500/10 active:scale-95"
                style={{ borderColor: "var(--border)" }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
