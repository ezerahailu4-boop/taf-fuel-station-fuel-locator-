"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/customer/PageHeader";
import { SafetyNote } from "@/components/customer/StateViews";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const card = "mx-4 rounded-3xl p-5 shadow-sm ring-1 ring-black/5";
  return (
    <main className="space-y-4">
      <PageHeader title={t("title")} />
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
