"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { useStations } from "@/components/customer/StationsProvider";
import { PageHeader } from "@/components/customer/PageHeader";

export default function FeedbackPage() {
  const t = useTranslations("feedback");
  const { state } = useAuth();
  const { stations } = useStations();

  const user = state.status === "authenticated" ? state.user : null;

  const [name, setName] = useState(user ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}` : "");
  const [contact, setContact] = useState(user?.username ? `@${user.username}` : "");
  const [stationId, setStationId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError(t("errorEmpty"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          contact: contact.trim() || undefined,
          stationId: stationId || undefined,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message ||
              data.error?.details?.[0]?.message ||
              t("errorGeneric");
        throw new Error(msg);
      }

      setSubmitted(true);
      setMessage("");
    } catch (err: any) {
      setError(err.message || t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setMessage("");
    setError(null);
  };

  return (
    <main className="space-y-4 pb-12 max-w-lg mx-auto">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="px-4">
        {submitted ? (
          <div
            className="rounded-3xl p-6 text-center shadow-sm ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-300"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-4">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {t("successTitle")}
            </h2>
            <p className="mt-2 text-xs leading-relaxed max-w-xs mx-auto" style={{ color: "var(--muted)" }}>
              {t("successBody")}
            </p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-brand-orange px-6 py-3 text-xs font-bold text-neutral-900 shadow-md transition-all active:scale-95 hover:brightness-105"
            >
              {t("sendAnother")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl p-5 shadow-sm ring-1 ring-black/5 space-y-4"
            style={{ background: "var(--surface)" }}
          >
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {error}
              </div>
            )}

            {/* Name field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold" style={{ color: "var(--text)" }}>
                {t("nameLabel")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={100}
                className="w-full rounded-2xl border px-3.5 py-2.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Contact info field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold" style={{ color: "var(--text)" }}>
                {t("contactLabel")}
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t("contactPlaceholder")}
                maxLength={150}
                className="w-full rounded-2xl border px-3.5 py-2.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            {/* Station dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold" style={{ color: "var(--text)" }}>
                {t("stationLabel")}
              </label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full rounded-2xl border px-3.5 py-2.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <option value="">{t("generalStation")}</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `TAF ${s.branchName}`} {s.area ? `(${s.area})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Message / Issue field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold" style={{ color: "var(--text)" }}>
                {t("messageLabel")} <span className="text-amber-600 dark:text-amber-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                maxLength={2000}
                className="w-full rounded-2xl border px-3.5 py-2.5 text-xs leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
              <div className="flex justify-between items-center text-[10px]" style={{ color: "var(--muted)" }}>
                <span>{message.length} / 2000</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-orange py-3 text-xs font-bold text-neutral-900 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none hover:brightness-105"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
                  <span>{t("sending")}</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>{t("submit")}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
