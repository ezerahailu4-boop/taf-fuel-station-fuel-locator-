"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

export interface FuelTypeItem {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
}

export function FuelTypesManager({
  fuelTypes,
  onRefresh,
}: {
  fuelTypes: FuelTypeItem[];
  onRefresh: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelTypeItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    slug: "",
    nameEn: "",
    nameAm: "",
    icon: "⛽",
    displayOrder: 1,
    isActive: true,
  });

  function startCreate() {
    setFormData({
      slug: "",
      nameEn: "",
      nameAm: "",
      icon: "⛽",
      displayOrder: fuelTypes.length + 1,
      isActive: true,
    });
    setIsCreating(true);
    setMessage(null);
  }

  function startEdit(f: FuelTypeItem) {
    setEditingFuel(f);
    setFormData({
      slug: f.slug,
      nameEn: f.nameEn,
      nameAm: f.nameAm,
      icon: f.icon,
      displayOrder: f.displayOrder,
      isActive: f.isActive,
    });
    setMessage(null);
  }

  async function handleSaveCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch("/api/admin/fuel-types", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setMessage({ type: "success", text: "Fuel type created!" });
      setIsCreating(false);
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create fuel type" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFuel) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/fuel-types/${editingFuel.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setMessage({ type: "success", text: "Fuel type updated!" });
      setEditingFuel(null);
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update fuel type" });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(f: FuelTypeItem) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/fuel-types/${f.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !f.isActive }),
      });
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-orange";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Fuel Types</h2>
          <p className="text-xs text-neutral-500">
            Configure fuels offered by TAF stations across Ethiopia.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-1.5 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm hover:opacity-90 active:scale-95"
        >
          <span>＋</span>
          <span>Add Fuel Type</span>
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

      <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50/50 text-xs text-neutral-500 dark:bg-neutral-900/50" style={{ borderColor: "var(--border)" }}>
            <tr>
              <th className="p-4">Fuel Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Amharic (ስም)</th>
              <th className="p-4">Order</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {fuelTypes.map((f) => (
              <tr key={f.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/30">
                <td className="p-4 font-semibold">
                  <span className="mr-2 text-lg">{f.icon}</span>
                  {f.nameEn}
                </td>
                <td className="p-4 font-mono text-xs text-neutral-500">{f.slug}</td>
                <td className="p-4 font-medium">{f.nameAm}</td>
                <td className="p-4 font-mono text-xs">{f.displayOrder}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${f.isActive ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"}`}>
                    {f.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => startEdit(f)}
                    className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(f)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      f.isActive
                        ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                        : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                    }`}
                  >
                    {f.isActive ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create or Edit */}
      {(isCreating || editingFuel) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-lg font-bold">
                {isCreating ? "Add Fuel Type" : `Edit Fuel: ${editingFuel?.nameEn}`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingFuel(null);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isCreating ? handleSaveCreate : handleSaveEdit} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Slug (e.g. diesel, benzine) *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. lpg"
                  value={formData.slug}
                  disabled={!isCreating}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  className={inputClass}
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold">English Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Benzine"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Amharic (ስም) *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ቤንዚን"
                    value={formData.nameAm}
                    onChange={(e) => setFormData({ ...formData, nameAm: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Emoji Icon</span>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold">Display Order</span>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                    className={inputClass}
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingFuel(null);
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
                  style={{ borderColor: "var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-brand-orange px-5 py-2 text-sm font-semibold text-neutral-900 hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save Fuel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
