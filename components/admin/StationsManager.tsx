"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { StationStatusBadge } from "@/components/ui/StatusBadge";
import type { StationStatus } from "@/lib/fuel/enums";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GasStationIcon, 
  SearchIcon, 
  PlusIcon, 
  MapPinIcon, 
  UsersIcon, 
  PhoneIcon,
  CheckCircleIcon 
} from "@/components/ui/icons";

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
        body: JSON.stringify(formData),
      });
      setMessage({ type: "success", text: `TAF ${formData.branchName} created successfully!` });
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
        body: JSON.stringify(formData),
      });
      setMessage({ type: "success", text: `TAF ${formData.branchName} updated successfully!` });
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
      alert(err instanceof Error ? err.message : "Failed to toggle status");
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

  const inputClass = "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60";

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <GasStationIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-black tracking-tight">Station Network</CardTitle>
                  <Badge variant="brand">{stations.length} Stations</Badge>
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    {stations.filter((s) => s.isActive).length} Active
                  </Badge>
                </div>
                <CardDescription>
                  Manage TAF fuel stations, physical coordinates, and branch manager assignments.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search stations or cities…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs outline-none transition-colors"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </div>
              <Button variant="brand" size="sm" onClick={startCreate}>
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Station</span>
              </Button>
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

      {/* Stations Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-neutral-50/50 text-xs font-medium text-neutral-500 dark:bg-neutral-900/50" style={{ borderColor: "var(--border)" }}>
              <tr>
                <th className="p-4">Station & Branch</th>
                <th className="p-4">Location & Coordinates</th>
                <th className="p-4">Operational Status</th>
                <th className="p-4">Branch Manager</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-neutral-500 text-xs">
                    No stations match your search query.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
                          ⛽
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <span>TAF {s.branchName}</span>
                            {!s.isActive && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Inactive</Badge>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500">{s.name}</div>
                          {s.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                              <PhoneIcon className="w-3 h-3" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="flex items-start gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium text-neutral-800 dark:text-neutral-200">{s.address}</div>
                          <div className="text-neutral-500">{[s.area, s.city].filter(Boolean).join(", ")}</div>
                          <div className="font-mono text-[10px] text-neutral-400 mt-0.5">
                            {s.latitude.toFixed(4)}° N, {s.longitude.toFixed(4)}° E
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <StationStatusBadge status={s.status} />
                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${s.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
                          {s.isActive ? "Active Network" : "Disabled"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      {s.admin ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1">
                            <UsersIcon className="w-3 h-3 text-neutral-400" />
                            <span>{s.admin.name}</span>
                          </div>
                          <div className="font-mono text-[11px] text-neutral-500">ID: {s.admin.telegramUserId}</div>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">No staff assigned</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningStation(s);
                          setAdminTgId(s.admin?.telegramUserId || "");
                        }}
                        className="mt-1 block text-[11px] font-bold text-amber-600 hover:text-amber-500 transition-colors"
                      >
                        {s.admin ? "Reassign Manager" : "＋ Assign Manager"}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={s.isActive ? "secondary" : "brand"}
                        size="sm"
                        onClick={() => handleToggleActive(s)}
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create or Edit */}
      {(isCreating || editingStation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border-border/80">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <CardTitle className="text-base font-bold">
                  {isCreating ? "Add New TAF Station" : `Edit Station: TAF ${editingStation?.branchName}`}
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in station coordinates and metadata.
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingStation(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ✕
              </button>
            </CardHeader>

            <CardContent className="pt-2">
              <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Station Name</span>
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
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Branch Name *</span>
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
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Full Address *</span>
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
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">City *</span>
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
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Area</span>
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
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Latitude *</span>
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
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Longitude *</span>
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
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Phone</span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Status</span>
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

                <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingStation(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="brand"
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save Station"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Assign Branch Admin */}
      {assigningStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl space-y-4 border-border/80">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <CardTitle className="text-base font-bold">Assign Manager</CardTitle>
                <CardDescription className="text-xs">
                  TAF {assigningStation.branchName}
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setAssigningStation(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="pt-2">
              <form onSubmit={handleAssignAdmin} className="space-y-4">
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Enter the numeric Telegram user ID of the branch manager (obtained via @userinfobot). They can instantly manage fuel queues and inventory at <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">/branch</code>.
                </p>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Telegram Numeric User ID *</span>
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
                <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAssigningStation(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="brand"
                    disabled={busy || adminTgId.length === 0}
                  >
                    {busy ? "Saving…" : "Assign Manager"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
