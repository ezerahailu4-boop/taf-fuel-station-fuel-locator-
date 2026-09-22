"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiClientError } from "@/lib/client/api";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const t = useTranslations("login");
  const c = useTranslations("common");
  const { requestCode, loginWithCode } = useAuth();
  const [telegramId, setTelegramId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"id" | "code">("id");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestCode(telegramId.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : c("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginWithCode(telegramId.trim(), code.trim());
    } catch (err) {
      setError(err instanceof ApiClientError && err.status === 401 ? t("invalid") : err instanceof ApiClientError ? err.message : c("retry"));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]";

  return (
    <div className="mx-auto w-full max-w-sm space-y-5 rounded-3xl p-6 shadow-sm ring-1 ring-black/5" style={{ background: "var(--surface)" }}>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {step === "id" ? (
        <form onSubmit={send} className="space-y-4">
          <p style={{ color: "var(--muted)" }}>{t("intro")}</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("telegramId")}</span>
            <input className={input} style={{ background: "var(--bg)", borderColor: "var(--border)" }} inputMode="numeric" autoComplete="username" pattern="\d{1,15}" required value={telegramId} onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))} />
          </label>
          <button disabled={busy || telegramId.length === 0} className="min-h-12 w-full rounded-xl bg-brand-orange px-4 font-semibold text-neutral-900 disabled:opacity-50">
            {busy ? c("loading") : t("sendCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p style={{ color: "var(--muted)" }}>{t("codeSent")}</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("code")}</span>
            <input className={`${input} tracking-[0.4em]`} style={{ background: "var(--bg)", borderColor: "var(--border)" }} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </label>
          <button disabled={busy || code.length !== 6} className="min-h-12 w-full rounded-xl bg-brand-orange px-4 font-semibold text-neutral-900 disabled:opacity-50">
            {busy ? c("loading") : t("verify")}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}
