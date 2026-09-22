"use client";

import { useState } from "react";
import Image from "next/image";
import { ApiClientError } from "@/lib/client/api";
import { useAuth } from "./AuthProvider";

export function LoginForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { loginWithPassword, loginWithCode, requestCode } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useTelegramOtp, setUseTelegramOtp] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState<"id" | "code">("id");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await loginWithPassword(password.trim());
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof ApiClientError && err.status === 401
          ? "Incorrect admin password. Please try again."
          : err instanceof Error
          ? err.message
          : "Failed to sign in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestCode(telegramId.trim());
      setOtpStep("code");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to request code. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginWithCode(telegramId.trim(), code.trim());
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof ApiClientError && err.status === 401
          ? "Invalid verification code. Please try again."
          : "Failed to verify code. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const inputStyle =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

  return (
    <div
      className="mx-auto w-full max-w-sm space-y-6 rounded-3xl p-7 shadow-xl border ring-1 ring-black/5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-1.5 ring-1 ring-black/5 shadow-sm">
          <Image src="/brand/taf-logo.webp" alt="TAF" width={36} height={36} priority />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight">TAF Admin Sign In</h1>
          <p className="text-xs text-neutral-500">Super Admin & Staff Portal</p>
        </div>
      </div>

      {!useTelegramOtp ? (
        /* PASSWORD LOGIN FORM (DEFAULT) */
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-xs text-neutral-500">
            Enter your admin password to sign in to the Super Admin Dashboard.
          </p>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Admin Password
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className={inputStyle}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-xs text-neutral-400 hover:text-neutral-600 transition"
              >
                {showPassword ? "🙈 Hide" : "👁️ Show"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={busy || password.length === 0}
            className="min-h-11 w-full rounded-xl bg-brand-orange px-4 font-bold text-sm text-neutral-900 shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign In to Admin Portal →"}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setUseTelegramOtp(true);
                setError(null);
              }}
              className="text-xs text-neutral-400 hover:text-brand-orange transition"
            >
              Or sign in with Telegram Bot code instead
            </button>
          </div>
        </form>
      ) : (
        /* TELEGRAM OTP FALLBACK FORM */
        <div>
          {otpStep === "id" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-xs text-neutral-500">
                Enter your Telegram ID to receive a one-time login code via the TAF bot.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Telegram User ID
                </span>
                <input
                  className={inputStyle}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  inputMode="numeric"
                  autoComplete="username"
                  pattern="\d{1,15}"
                  required
                  placeholder="e.g. 2074368152"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <button
                type="submit"
                disabled={busy || telegramId.length === 0}
                className="min-h-11 w-full rounded-xl bg-brand-orange px-4 font-bold text-sm text-neutral-900 shadow-sm transition hover:brightness-105 disabled:opacity-50"
              >
                {busy ? "Sending Code..." : "Send Telegram Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-neutral-500">
                Check your Telegram messages from @taf_fuel_bot for the 6-digit code.
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  6-Digit Verification Code
                </span>
                <input
                  className={`${inputStyle} tracking-[0.4em] text-center font-mono font-bold text-base`}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="min-h-11 w-full rounded-xl bg-brand-orange px-4 font-bold text-sm text-neutral-900 shadow-sm transition hover:brightness-105 disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Verify & Sign In"}
              </button>
            </form>
          )}

          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setUseTelegramOtp(false);
                setError(null);
              }}
              className="text-xs text-neutral-400 hover:text-brand-orange transition"
            >
              ← Back to Password Sign In
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/50 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 font-medium"
        >
          {error}
        </div>
      )}
    </div>
  );
}
