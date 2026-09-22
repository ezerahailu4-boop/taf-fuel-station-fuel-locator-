"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const LABELS: Record<string, string> = { en: "English", am: "አማርኛ" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();

  function change(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t("language")}</span>
      <select value={locale} onChange={(e) => change(e.target.value)} className="min-h-10 rounded-lg border px-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {Object.entries(LABELS).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
