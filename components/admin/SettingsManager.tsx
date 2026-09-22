"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

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
      setMessage({ type: "success", text: "Settings saved successfully!" });
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-orange";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold">System Configuration</h2>
        <p className="text-xs text-neutral-500">
          Global thresholds, brand name, and notification cooldown rules.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            message.type === "success" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border p-6 shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Company Name</span>
            <input
              type="text"
              value={String(settings.company_name ?? "TAF Fuel Station")}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              className={inputClass}
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold">Default Nearby Radius (km)</span>
              <input
                type="number"
                min="1"
                max="100"
                value={Number(settings.default_radius_km ?? 25)}
                onChange={(e) => setSettings({ ...settings, default_radius_km: parseInt(e.target.value) || 25 })}
                className={inputClass}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
              <span className="block text-[11px] text-neutral-500">Radius used for customer station search</span>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold">Staleness Threshold (minutes)</span>
              <input
                type="number"
                min="10"
                max="1440"
                value={Number(settings.stale_after_minutes ?? 120)}
                onChange={(e) => setSettings({ ...settings, stale_after_minutes: parseInt(e.target.value) || 120 })}
                className={inputClass}
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              />
              <span className="block text-[11px] text-neutral-500">Flags reports as outdated after this duration</span>
            </label>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-bold mb-3">Telegram Notifications & Alerts</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_notify_enabled !== false}
                  onChange={(e) => setSettings({ ...settings, auto_notify_enabled: e.target.checked })}
                  className="h-4 w-4 rounded accent-brand-orange"
                />
                <div>
                  <span className="text-sm font-semibold">Enable Automatic Telegram Alerts</span>
                  <span className="block text-xs text-neutral-500">Notify subscribed customers when fuel status becomes Available</span>
                </div>
              </label>

              <label className="block space-y-1 pt-2">
                <span className="text-xs font-semibold">Alert Cooldown Window (minutes)</span>
                <input
                  type="number"
                  min="5"
                  max="720"
                  value={Number(settings.auto_notify_cooldown_minutes ?? 30)}
                  onChange={(e) => setSettings({ ...settings, auto_notify_cooldown_minutes: parseInt(e.target.value) || 30 })}
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
                <span className="block text-[11px] text-neutral-500">Minimum time between alerts for the same station & fuel pair</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand-orange px-6 py-2.5 text-sm font-semibold text-neutral-900 shadow hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
