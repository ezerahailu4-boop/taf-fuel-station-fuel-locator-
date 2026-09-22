"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/client/api";

export interface SubscribeButtonProps {
  stationId: string;
  fuelTypeId: string;
  initialSubscribed?: boolean;
  subscriptionId?: string | null;
  onToggled?: (subscribed: boolean) => void;
  compact?: boolean;
  className?: string;
}

export function SubscribeButton({
  stationId,
  fuelTypeId,
  initialSubscribed = false,
  subscriptionId = null,
  onToggled,
  compact = false,
  className = "",
}: SubscribeButtonProps) {
  const t = useTranslations("alerts");
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [subId, setSubId] = useState<string | null>(subscriptionId);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const nextState = !subscribed;

    try {
      if (nextState) {
        // Subscribe
        const res = await apiFetch<{ subscription: { id: string } }>("/api/subscriptions", {
          method: "POST",
          body: JSON.stringify({ stationId, fuelTypeId }),
        });
        setSubscribed(true);
        setSubId(res.subscription.id);
        onToggled?.(true);
      } else {
        // Unsubscribe
        if (subId) {
          await apiFetch(`/api/subscriptions/${subId}`, { method: "DELETE" });
        }
        setSubscribed(false);
        setSubId(null);
        onToggled?.(false);
      }
    } catch (err) {
      console.error("[subscribe-toggle] Error:", err);
      // Revert
      setSubscribed(!nextState);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={subscribed ? t("unsubscribe") : t("subscribe")}
      title={subscribed ? t("unsubscribe") : t("subscribe")}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl transition-all active:scale-95 ${
        compact ? "p-2 text-base" : "px-3 py-1.5 text-xs font-semibold"
      } ${
        subscribed
          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
      } ${loading ? "opacity-60" : ""} ${className}`}
    >
      <span aria-hidden>{subscribed ? "🔔" : "🔕"}</span>
      {!compact && (
        <span>{subscribed ? t("subscribed") : t("notifyMe")}</span>
      )}
    </button>
  );
}
