import { useTranslations } from "next-intl";
import type { FuelStatus, StationStatus } from "@/lib/fuel/enums";

/** Status is ALWAYS conveyed by icon + text + color, never by color alone. */
const FUEL_STYLE: Record<FuelStatus, { icon: string; cls: string }> = {
  AVAILABLE: { icon: "🟢", cls: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200" },
  LIMITED: { icon: "🟡", cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  OUT_OF_STOCK: { icon: "🔴", cls: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
  UNKNOWN: { icon: "⚪", cls: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200" },
};

const STATION_STYLE: Record<StationStatus, { icon: string; cls: string }> = {
  OPEN: { icon: "🟢", cls: FUEL_STYLE.AVAILABLE.cls },
  CLOSED: { icon: "🔴", cls: FUEL_STYLE.OUT_OF_STOCK.cls },
  TEMPORARILY_CLOSED: { icon: "🟠", cls: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200" },
  MAINTENANCE: { icon: "⚠️", cls: FUEL_STYLE.LIMITED.cls },
};

const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold";

export function FuelStatusBadge({ status }: { status: FuelStatus }) {
  const t = useTranslations("fuel.status");
  const s = FUEL_STYLE[status];
  return (
    <span className={`${base} ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {t(status)}
    </span>
  );
}

export function StationStatusBadge({ status }: { status: StationStatus }) {
  const t = useTranslations("station.status");
  const s = STATION_STYLE[status];
  return (
    <span className={`${base} ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {t(status)}
    </span>
  );
}
