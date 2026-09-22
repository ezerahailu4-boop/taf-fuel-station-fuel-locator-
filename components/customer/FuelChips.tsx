"use client";

import { useLocale, useTranslations } from "next-intl";
import type { FuelTypeRow } from "@/types/stations";

/** Large single-select chips for choosing a fuel type. */
export function FuelChips({ fuelTypes, value, onChange, allowAny = false }: { fuelTypes: FuelTypeRow[]; value: string | null; onChange: (slug: string | null) => void; allowAny?: boolean }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const chip = (active: boolean) =>
    `min-h-12 shrink-0 rounded-full border px-5 text-base font-semibold transition-colors ${active ? "border-transparent bg-brand-orange text-neutral-900" : ""}`;
  return (
    <div role="group" aria-label={t("fuelTitle")} className="flex gap-2 overflow-x-auto px-4 pb-1">
      {allowAny && (
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)} style={value === null ? undefined : { borderColor: "var(--border)", background: "var(--surface)" }}>
          {t("anyFuel")}
        </button>
      )}
      {fuelTypes.map((f) => {
        const active = value === f.slug;
        return (
          <button key={f.id} type="button" aria-pressed={active} onClick={() => onChange(f.slug)} className={chip(active)} style={active ? undefined : { borderColor: "var(--border)", background: "var(--surface)" }}>
            <span aria-hidden>{f.icon} </span>
            {locale === "am" ? f.nameAm : f.nameEn}
          </button>
        );
      })}
    </div>
  );
}
