"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/customer/PageHeader";
import { SafetyNote } from "@/components/customer/StateViews";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSelector } from "@/components/theme/ThemeSelector";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const card = "mx-4 rounded-3xl p-5 shadow-sm ring-1 ring-black/5";
  return (
    <main className="space-y-4">
      <PageHeader title={t("title")} />

      {/* Theme: White or Black */}
      <section className={card} style={{ background: "var(--surface)" }}>
        <div className="space-y-3">
          <div>
            <h2 className="font-bold">🌓 {t("theme")}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Switch between White (Light) and Black (Dark) interface themes.
            </p>
          </div>
          <ThemeSelector />
        </div>
      </section>

      {/* Language */}
      <section className={card} style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">🌐 {t("language")}</h2>
          <LocaleSwitcher />
        </div>
      </section>
      <section className={card} style={{ background: "var(--surface)" }}>
        <h2 className="mb-1 font-bold">ℹ️ {t("about")}</h2>
        <p style={{ color: "var(--muted)" }}>{t("aboutBody")}</p>
      </section>
      <section className={card} style={{ background: "var(--surface)" }}>
        <h2 className="mb-1 font-bold">🔒 {t("privacy")}</h2>
        <p style={{ color: "var(--muted)" }}>{t("privacyBody")}</p>
      </section>
      <SafetyNote />
    </main>
  );
}
