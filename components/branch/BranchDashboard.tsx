"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { FuelStatusBadge, StationStatusBadge } from "@/components/ui/StatusBadge";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { SETTABLE_FUEL_STATUSES, STATION_STATUSES, type SettableFuelStatus, type StationStatus } from "@/lib/fuel/enums";
import { ApiClientError, NetworkError } from "@/lib/client/api";
import type { PublicUser } from "@/types/auth";
import type { ActivityDTO, Page, StationDTO, StationFuelDTO } from "@/types/stations";

type Draft = Record<string, SettableFuelStatus | null>;

const KNOWN_ACTIVITY = new Set(["FUEL_STATUS_CHANGED", "FUEL_NOTE_CHANGED", "STATION_STATUS_CHANGED", "AVAILABILITY_CONFIRMED", "ACCESS_DENIED"]);

const isSettable = (s: string): s is SettableFuelStatus => (SETTABLE_FUEL_STATUSES as readonly string[]).includes(s);
const originalOf = (f: StationFuelDTO): SettableFuelStatus | null => (isSettable(f.status) ? f.status : null);

export function BranchDashboard({ user }: { user: PublicUser }) {
  const t = useTranslations("branch");
  const c = useTranslations("common");
  const tFuel = useTranslations("fuel");
  const tApp = useTranslations("app");
  const tStation = useTranslations("station.status");
  const locale = useLocale();
  const { api, logout, state } = useAuth();

  const isBranchAdmin = user.role === "BRANCH_ADMIN";
  const canWrite = user.role === "BRANCH_ADMIN" || user.role === "SUPER_ADMIN";

  const [options, setOptions] = useState<Array<{ id: string; branchName: string; city: string }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [station, setStation] = useState<StationDTO | null>(null);
  const [activity, setActivity] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>({});
  const [draftStatus, setDraftStatus] = useState<StationStatus>("OPEN");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const tErrors = useTranslations("errors");
  const errorText = useCallback(
    (e: unknown) => (e instanceof NetworkError ? tErrors("network") : e instanceof ApiClientError ? e.message : tErrors("server")),
    [tErrors],
  );

  // Super Admin / Viewer choose a station; branch admins are fixed to theirs.
  useEffect(() => {
    if (isBranchAdmin) return;
    api<Page<StationDTO>>("/api/stations?pageSize=50")
      .then((p) => {
        setOptions(p.items.map((s) => ({ id: s.id, branchName: s.branchName, city: s.city })));
        setSelectedId((cur) => cur ?? p.items[0]?.id ?? null);
      })
      .catch((e) => setLoadError(errorText(e)));
  }, [api, isBranchAdmin, errorText]);

  const stationParam = isBranchAdmin ? "" : selectedId ? `stationId=${selectedId}` : null;

  const load = useCallback(async () => {
    if (stationParam === null) return;
    setLoading(true);
    setLoadError(null);
    try {
      const q = stationParam ? `?${stationParam}` : "";
      const [s, a] = await Promise.all([
        api<{ station: StationDTO }>(`/api/branch/station${q}`),
        api<Page<ActivityDTO>>(`/api/branch/activity${q ? `${q}&` : "?"}pageSize=10`),
      ]);
      setStation(s.station);
      setActivity(a.items);
      setDraft(Object.fromEntries(s.station.fuels.map((f) => [f.fuelTypeId, originalOf(f)])));
      setDraftStatus(s.station.status);
    } catch (e) {
      setLoadError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [api, stationParam, errorText]);

  useEffect(() => {
    void load();
  }, [load]);

  const fuelName = (f: { nameEn: string; nameAm: string }) => (locale === "am" ? f.nameAm : f.nameEn);

  const changes = useMemo(() => {
    if (!station) return { fuels: [] as Array<{ fuel: StationFuelDTO; to: SettableFuelStatus }>, status: null as null | { from: StationStatus; to: StationStatus } };
    const fuels = station.fuels.flatMap((f) => {
      const to = draft[f.fuelTypeId];
      return to && to !== originalOf(f) ? [{ fuel: f, to }] : [];
    });
    const status = draftStatus !== station.status ? { from: station.status, to: draftStatus } : null;
    return { fuels, status };
  }, [station, draft, draftStatus]);

  const dirty = changes.fuels.length > 0 || changes.status !== null;

  async function save() {
    if (!station || !dirty) return;
    setBusy(true);
    try {
      await api("/api/branch/availability", {
        method: "PUT",
        body: {
          ...(isBranchAdmin ? {} : { stationId: station.id }),
          ...(changes.status ? { stationStatus: changes.status.to } : {}),
          fuels: changes.fuels.map((x) => ({ fuelTypeId: x.fuel.fuelTypeId, status: x.to })),
        },
      });
      setReviewOpen(false);
      setToast({ kind: "success", text: t("savedToast") });
      await load();
    } catch (e) {
      setReviewOpen(false);
      setToast({ kind: "error", text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function confirmCurrent() {
    if (!station) return;
    setBusy(true);
    try {
      await api("/api/branch/confirm", { method: "POST", body: isBranchAdmin ? {} : { stationId: station.id } });
      setToast({ kind: "success", text: t("confirmedToast") });
      await load();
    } catch (e) {
      setToast({ kind: "error", text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  const fuelOptions: SegmentOption<SettableFuelStatus>[] = [
    { value: "AVAILABLE", label: t("fuelOptions.AVAILABLE"), icon: "🟢", activeClass: "border-green-700 bg-green-600 text-white" },
    { value: "LIMITED", label: t("fuelOptions.LIMITED"), icon: "🟡", activeClass: "border-amber-600 bg-amber-400 text-neutral-900" },
    { value: "OUT_OF_STOCK", label: t("fuelOptions.OUT_OF_STOCK"), icon: "🔴", activeClass: "border-red-700 bg-red-600 text-white" },
  ];
  const stationOptions: SegmentOption<StationStatus>[] = STATION_STATUSES.map((s) => ({
    value: s,
    label: tStation(s),
    icon: s === "OPEN" ? "🟢" : s === "CLOSED" ? "🔴" : s === "TEMPORARILY_CLOSED" ? "🟠" : "⚠️",
    activeClass: "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900",
  }));

  const card = "rounded-3xl p-5 shadow-sm ring-1 ring-black/5";

  function describeActivity(a: ActivityDTO): string {
    if (!KNOWN_ACTIVITY.has(a.action)) return t("activity.other", { action: a.action });
    const nv = (a.newValue ?? {}) as { fuel?: string; status?: string };
    const ov = (a.oldValue ?? {}) as { status?: string };
    const fuelObj = station?.fuels.find((f) => f.slug === nv.fuel);
    const isStationStatus = a.action === "STATION_STATUS_CHANGED";
    const label = (s?: string) => (!s ? "–" : isStationStatus ? tStation(s as StationStatus) : tFuel(`status.${s}`));
    return t(`activity.${a.action}` as "activity.FUEL_STATUS_CHANGED", {
      fuel: fuelObj ? fuelName(fuelObj) : (nv.fuel ?? ""),
      from: label(ov.status),
      to: label(nv.status),
    });
  }

  if (isBranchAdmin && !user.stationId) {
    return <p className="mx-auto max-w-md p-6 text-center">{t("noStation")}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-32 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-1.5 ring-1 ring-black/5">
            <Image src="/brand/taf-logo.webp" alt="TAF" width={36} height={36} />
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t("title")}</p>
            <h1 className="text-xl font-bold leading-tight">{station ? `TAF ${station.branchName}` : "TAF"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {state.status === "authenticated" && (
            <button onClick={() => void logout()} className="min-h-10 rounded-lg border px-3 text-sm" style={{ borderColor: "var(--border)" }}>
              {c("logout")}
            </button>
          )}
        </div>
      </header>

      {!isBranchAdmin && options.length > 0 && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("pickStation")}</span>
          <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)} className="min-h-12 w-full rounded-xl border px-3 text-base" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{`${o.branchName} · ${o.city}`}</option>
            ))}
          </select>
        </label>
      )}

      {!canWrite && <p className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-900">{c("readOnly")}</p>}

      {loadError && (
        <div role="alert" className="space-y-3 rounded-2xl bg-red-100 p-4 text-red-900">
          <p>{loadError}</p>
          <button onClick={() => void load()} className="min-h-11 rounded-xl bg-red-700 px-4 font-semibold text-white">{c("retry")}</button>
        </div>
      )}

      {loading && !station && !loadError && (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {station && (
        <>
          <section className={card} style={{ background: "var(--surface)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("stationStatus")}</h2>
              <StationStatusBadge status={station.status} />
            </div>
            <SegmentedControl label={t("stationStatus")} options={stationOptions} value={draftStatus} onChange={setDraftStatus} disabled={!canWrite || busy} columns={2} />
          </section>

          {station.fuels.map((f) => (
            <section key={f.fuelTypeId} className={card} style={{ background: "var(--surface)" }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">
                  <span aria-hidden>{f.icon} </span>
                  {fuelName(f)}
                </h2>
                <FuelStatusBadge status={f.status} />
              </div>
              <p className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
                {f.lastUpdated ? `${c("lastUpdated")}: ` : c("notReported")}
                {f.lastUpdated && <RelativeTime value={f.lastConfirmedAt && f.lastConfirmedAt > f.lastUpdated ? f.lastConfirmedAt : f.lastUpdated} />}
              </p>
              {f.isStale && <p className="mb-3 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">⚠️ {tFuel("stale")}</p>}
              <SegmentedControl label={fuelName(f)} options={fuelOptions} value={draft[f.fuelTypeId] ?? null} onChange={(v) => setDraft((d) => ({ ...d, [f.fuelTypeId]: v }))} disabled={!canWrite || busy} />
            </section>
          ))}

          {canWrite && (
            <section className={card} style={{ background: "var(--surface)" }}>
              <p className="mb-3" style={{ color: "var(--muted)" }}>{t("stillAccurateHint")}</p>
              <button onClick={() => void confirmCurrent()} disabled={busy || dirty} className="min-h-12 w-full rounded-xl border px-4 font-semibold disabled:opacity-50" style={{ borderColor: "var(--border)" }}>
                {t("stillAccurate")}
              </button>
            </section>
          )}

          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>{tApp("disclaimer")}</p>

          <section className={card} style={{ background: "var(--surface)" }}>
            <h2 className="mb-3 text-lg font-bold">{t("history")}</h2>
            {activity.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>{t("noHistory")}</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex flex-col gap-0.5 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
                    <span className="font-medium">{describeActivity(a)}</span>
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      <RelativeTime value={a.createdAt} />
                      {a.actor && ` · ${t("by", { name: a.actor.firstName })}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {canWrite && station && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <p className="flex-1 text-sm" style={{ color: "var(--muted)" }}>{dirty ? t("unsaved") : t("nothingChanged")}</p>
            <button onClick={() => setReviewOpen(true)} disabled={!dirty || busy} className="min-h-12 rounded-xl bg-brand-orange px-6 font-bold text-neutral-900 disabled:opacity-40">
              {c("save")}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog open={reviewOpen} title={t("reviewTitle")} confirmLabel={c("confirm")} cancelLabel={c("cancel")} busy={busy} onConfirm={() => void save()} onCancel={() => setReviewOpen(false)}>
        <p className="mb-3" style={{ color: "var(--muted)" }}>{t("reviewIntro")}</p>
        <ul className="space-y-2">
          {changes.status && (
            <li className="rounded-xl px-3 py-2 ring-1 ring-black/10">
              {t("stationStatus")}: <b>{tStation(changes.status.from)}</b> → <b>{tStation(changes.status.to)}</b>
            </li>
          )}
          {changes.fuels.map((x) => (
            <li key={x.fuel.fuelTypeId} className="rounded-xl px-3 py-2 ring-1 ring-black/10">
              {fuelName(x.fuel)}: <b>{x.fuel.neverReported ? c("notReported") : tFuel(`status.${x.fuel.status}`)}</b> → <b>{tFuel(`status.${x.to}`)}</b>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
