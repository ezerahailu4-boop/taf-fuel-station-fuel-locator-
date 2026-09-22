"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsIcon, SlidersIcon, BellIcon, CheckCircleIcon } from "@/components/ui/icons";

export function SettingsManager({
  initialSettings,
  onRefresh,
}: {
  initialSettings: Record<string, unknown>;
  onRefresh: () => void;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setMessage({ type: "success", text: "Enterprise system configuration updated successfully!" });
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-black tracking-tight">System Configuration</CardTitle>
                <Badge variant="outline">Enterprise</Badge>
              </div>
              <CardDescription>
                Global thresholds, geofencing radii, and automated Telegram alert dispatch policies.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300"
          }`}
        >
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Parameters */}
        <Card>
          <CardHeader className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <SlidersIcon className="w-4 h-4 text-neutral-500" />
              <CardTitle className="text-sm font-bold">General Parameters & Geofencing</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Company Brand Name</span>
              <input
                type="text"
                value={String(settings.company_name ?? "TAF Fuel Station")}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className={inputClass}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
              <span className="block text-[11px] text-neutral-500">
                Displayed across customer Telegram bot messages and system alerts.
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Default Search Radius (km)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={Number(settings.default_radius_km ?? 25)}
                  onChange={(e) => setSettings({ ...settings, default_radius_km: parseInt(e.target.value) || 25 })}
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
                <span className="block text-[11px] text-neutral-500">
                  Maximum distance considered when finding stations near customer coordinates.
                </span>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Staleness Threshold (minutes)</span>
                <input
                  type="number"
                  min="10"
                  max="1440"
                  value={Number(settings.stale_after_minutes ?? 120)}
                  onChange={(e) => setSettings({ ...settings, stale_after_minutes: parseInt(e.target.value) || 120 })}
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
                <span className="block text-[11px] text-neutral-500">
                  Flags reports as outdated if not updated within this timeframe.
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Notifications */}
        <Card>
          <CardHeader className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-neutral-500" />
              <CardTitle className="text-sm font-bold">Automated Telegram Alert Dispatch</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-4 rounded-2xl border transition-colors" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_notify_enabled !== false}
                  onChange={(e) => setSettings({ ...settings, auto_notify_enabled: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded accent-amber-500"
                />
                <div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-white">Enable Customer Auto-Notifications</span>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Automatically send Telegram push notifications to subscribed customers when fuel status changes to Available at nearby branches.
                  </p>
                </div>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Notification Cooldown Period (minutes)</span>
              <input
                type="number"
                min="5"
                max="720"
                value={Number(settings.auto_notify_cooldown_minutes ?? 30)}
                onChange={(e) => setSettings({ ...settings, auto_notify_cooldown_minutes: parseInt(e.target.value) || 30 })}
                className={inputClass}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
              <span className="block text-[11px] text-neutral-500">
                Minimum cooldown window before re-alerting the same customer for the same branch and fuel type.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-neutral-500">
            Changes take effect immediately across all active Telegram bot sessions.
          </p>
          <Button
            type="submit"
            variant="brand"
            disabled={busy}
            className="px-6 py-2.5 font-bold shadow-md hover:shadow-lg"
          >
            {busy ? "Saving Settings…" : "Save Configuration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
