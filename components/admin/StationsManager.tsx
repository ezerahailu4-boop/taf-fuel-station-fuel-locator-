"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import type { StationStatus } from "@/lib/fuel/enums";

export interface StationItem {
  id: string;
  name: string;
  branchName: string;
  city: string;
  area: string | null;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  status: StationStatus;
  isActive: boolean;
  admin: { id: string; name: string; telegramUserId: string } | null;
  fuels?: Array<{ slug: string; nameEn: string; icon: string; status: string }>;
}

export function StationsManager({
  stations,
  onRefresh,
}: {
  stations: StationItem[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [editingStation, setEditingStation] = useState<StationItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [assigningStation, setAssigningStation] = useState<StationItem | null>(null);
  const [adminTgId, setAdminTgId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "TAF Fuel Station",
    branchName: "",
    address: "",
    city: "Addis Ababa",
    area: "",
    phone: "+2519",
    latitude: 9.03,
    longitude: 38.74,
    is24h: true,
    status: "OPEN" as StationStatus,
  });

  const filtered = stations.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.branchName.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      (s.area && s.area.toLowerCase().includes(q))
    );
  });

  function startCreate() {
    setFormData({
      name: "TAF Fuel Station",
      branchName: "",
      address: "",
      city: "Addis Ababa",
      area: "",
      phone: "+2519",
      latitude: 9.03,
      longitude: 38.74,
      is24h: true,
      status: "OPEN",
    });
    setIsCreating(true);
    setMessage(null);
  }

  function startEdit(s: StationItem) {
    setEditingStation(s);
    setFormData({
      name: s.name,
      branchName: s.branchName,
      address: s.address,
      city: s.city,
      area: s.area || "",
      phone: s.phone || "",
      latitude: s.latitude,
      longitude: s.longitude,
      is24h: true,
      status: s.status,
    });
    setMessage(null);
  }

  async function handleSaveCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/api/admin/stations", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          branchName: formData.branchName,
          address: formData.address,
          city: formData.city,
          area: formData.area || undefined,
          phone: formData.phone || undefined,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          openingHours: formData.is24h ? { is24h: true } : { is24h: false },
          status: formData.status,
        }),
      });
      setMessage({ type: "success", text: "Station created successfully!" });
      setIsCreating(false);
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create station" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStation) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/stations/${editingStation.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.name,
          branchName: formData.branchName,
          address: formData.address,
          city: formData.city,
          area: formData.area || undefined,
          phone: formData.phone || undefined,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          status: formData.status,
        }),
      });
      setMessage({ type: "success", text: "Station updated successfully!" });
      setEditingStation(null);
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update station" });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(s: StationItem) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/stations/${s.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update station");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningStation) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/stations/${assigningStation.id}/admin`, {
        method: "PUT",
        body: JSON.stringify({ telegramUserId: adminTgId.trim() }),
      });
      setMessage({ type: "success", text: `Branch Manager assigned to TAF ${assigningStation.branchName}!` });
      setAssigningStation(null);
      setAdminTgId("");
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to assign admin" });
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-orange";

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="Search stations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm pl-8 outline-none"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <span className="absolute left-2.5 top-2.5 text-xs text-neutral-400">🔍</span>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:opacity-90 active:scale-95"
        >
          <span>＋</span>
          <span>Add New Station</span>
        </button>
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

      {/* Stations Table / Cards */}
      <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-neutral-50/50 text-xs text-neutral-500 dark:bg-neutral-900/50" style={{ borderColor: "var(--border)" }}>
              <tr>
                <th className="p-4">Station & Branch</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4">Branch Manager</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    No stations found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/30">
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⛽</span>
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white">
                            TAF {s.branchName}
                          </div>
                          <div className="text-xs text-neutral-500">{s.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      <div>{s.address}</div>
                      <div className="text-neutral-500">{[s.area, s.city].filter(Boolean).join(", ")}</div>
                      <div className="font-mono text-[11px] text-neutral-400">
                        {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <StationStatusBadge status={s.status} />
                        <span className={`text-[11px] font-semibold ${s.isActive ? "text-emerald-600" : "text-neutral-400"}`}>
                          {s.isActive ? "● Active" : "○ Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      {s.admin ? (
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-white">{s.admin.name}</div>
                          <div className="font-mono text-[11px] text-neutral-500">ID: {s.admin.telegramUserId}</div>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">None assigned</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningStation(s);
                          setAdminTgId(s.admin?.telegramUserId || "");
                        }}
                        className="mt-1 block text-[11px] font-semibold text-brand-orange hover:underline"
                      >
                        {s.admin ? "Change Manager" : "＋ Assign Manager"}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          s.isActive
                            ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                            : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                        }`}
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit */}
      {(isCreating || editingStation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold">
                {isCreating ? "Add New TAF Station" : `Edit Station: TAF ${editingStation?.branchName}`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingStation(null);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Station Name</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Branch Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tolroad"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold">Full Address *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adama-Finfinee Rest Stop, Expressway"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold">City *</span>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Area</span>
                  <input
                    type="text"
                    placeholder="e.g. Expressway"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Latitude *</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Longitude *</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Phone</span>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Status</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StationStatus })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="TEMPORARILY_CLOSED">TEMPORARILY CLOSED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingStation(null);
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  style={{ borderColor: "var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-semibold text-neutral-900 hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save Station"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Branch Admin */}
      {assigningStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold">Assign Manager: TAF {assigningStation.branchName}</h2>
              <button
                type="button"
                onClick={() => setAssigningStation(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignAdmin} className="space-y-4">
              <p className="text-xs text-neutral-500">
                Enter the numeric Telegram user ID of the branch manager (e.g. via @userinfobot). They will be granted Branch Admin access to manage this station at /branch.
              </p>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Telegram Numeric User ID *</span>
                <input
                  type="text"
                  required
                  pattern="\d{1,15}"
                  placeholder="e.g. 2074368152"
                  value={adminTgId}
                  onChange={(e) => setAdminTgId(e.target.value.replace(/\D/g, ""))}
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningStation(null)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
                  style={{ borderColor: "var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || adminTgId.length === 0}
                  className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-semibold text-neutral-900 hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Assign Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
