"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { RelativeTime } from "@/components/ui/RelativeTime";
import {
  UsersIcon,
  RefreshIcon,
  SearchIcon,
  ZapIcon,
} from "@/components/ui/icons";

interface OpsAdminUser {
  id: string;
  telegramUserId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  hasPassword?: boolean;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface SearchBotUser {
  id: string;
  telegramUserId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: string;
}

export function OperationsAdminManager() {
  const [admins, setAdmins] = useState<OpsAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"credentials" | "search">("credentials");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchBotUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchBotUser | null>(null);
  const [selectedUserPassword, setSelectedUserPassword] = useState("");

  // Direct Username & Password input state
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualTelegramId, setManualTelegramId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Revoking state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<OpsAdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ admins: OpsAdminUser[] }>("/api/admin/users/operations-admin");
      setAdmins(res.admins || []);
    } catch (err) {
      console.error("[OperationsAdminManager] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load Operations Admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Search registered bot users
  useEffect(() => {
    if (!isModalOpen || addMode !== "search") return;

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const query = searchQuery.trim();
        const res = await apiFetch<{ users: SearchBotUser[] }>(
          `/api/admin/users?limit=20${query ? `&search=${encodeURIComponent(query)}` : ""}`
        );
        // Exclude users already having OPERATIONS_ADMIN
        const filtered = (res.users || []).filter((u) => u.role !== "OPERATIONS_ADMIN");
        setSearchResults(filtered);
      } catch (err) {
        console.error("[OperationsAdminManager] Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isModalOpen, addMode, searchQuery]);

  async function handleAddAdmin() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (addMode === "credentials") {
        if (!manualUsername.trim()) {
          setSubmitError("Please enter a username.");
          setSubmitting(false);
          return;
        }
        if (!manualPassword.trim() || manualPassword.trim().length < 4) {
          setSubmitError("Password must be at least 4 characters.");
          setSubmitting(false);
          return;
        }

        await apiFetch("/api/admin/users/operations-admin", {
          method: "POST",
          body: {
            username: manualUsername.trim().replace(/^@/, ""),
            password: manualPassword.trim(),
            firstName: manualFirstName.trim() || manualUsername.trim(),
            telegramUserId: manualTelegramId.trim() || undefined,
          },
        });
      } else {
        if (!selectedUser) {
          setSubmitError("Please select a user to promote.");
          setSubmitting(false);
          return;
        }
        await apiFetch("/api/admin/users/operations-admin", {
          method: "POST",
          body: {
            userId: selectedUser.id,
            password: selectedUserPassword.trim() || undefined,
          },
        });
      }

      setIsModalOpen(false);
      resetModal();
      await fetchAdmins();
    } catch (err) {
      console.error("[OperationsAdminManager] Submit error:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to add Operations Admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!resetModalUser) return;
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setResetError("New password must be at least 4 characters.");
      return;
    }

    setResettingPassword(true);
    setResetError(null);
    try {
      await apiFetch("/api/admin/users/operations-admin", {
        method: "PATCH",
        body: {
          userId: resetModalUser.id,
          password: newPassword.trim(),
        },
      });
      setResetModalUser(null);
      setNewPassword("");
      await fetchAdmins();
      alert(`Password for ${resetModalUser.firstName} has been updated successfully!`);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleRevoke(admin: OpsAdminUser) {
    if (!confirm(`Are you sure you want to remove Operations Admin permissions from ${admin.firstName}?`)) {
      return;
    }
    setRevokingId(admin.id);
    try {
      await apiFetch(`/api/admin/users/${admin.id}/role`, {
        method: "PATCH",
        body: { role: "CUSTOMER" },
      });
      await fetchAdmins();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke role");
    } finally {
      setRevokingId(null);
    }
  }

  function resetModal() {
    setSelectedUser(null);
    setSelectedUserPassword("");
    setSearchQuery("");
    setManualTelegramId("");
    setManualFirstName("");
    setManualUsername("");
    setManualPassword("");
    setSubmitError(null);
  }

  function copyTelegramId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="p-5 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-brand-orange/10 text-brand-orange">
                  <UsersIcon className="w-5 h-5" />
                </span>
                <CardTitle className="text-lg font-bold">Operations Administrators</CardTitle>
                <Badge variant="outline" className="text-xs bg-brand-orange/10 text-brand-orange border-brand-orange/20">
                  {admins.length} Staff
                </Badge>
              </div>
              <CardDescription className="mt-1 text-xs text-neutral-500">
                Create usernames and passwords for managers to access <strong>Overview</strong>, <strong>Feedback</strong>, <strong>Stations</strong>, <strong>Fuel Types</strong>, and <strong>Audit Logs</strong>.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAdmins}
                disabled={loading}
                className="text-xs"
                title="Refresh list"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  resetModal();
                  setIsModalOpen(true);
                }}
                className="text-xs font-bold px-4 rounded-xl shadow-sm"
              >
                <span>+ Add Operations Admin</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed rounded-3xl" style={{ borderColor: "var(--border)" }}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-brand-orange flex items-center justify-center mx-auto mb-3">
                <UsersIcon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                No Operations Admins added yet
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Create a username and password for a manager so they can sign in and manage stations and feedback.
              </p>
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  resetModal();
                  setIsModalOpen(true);
                }}
                className="mt-4 text-xs font-bold"
              >
                <span>+ Create First Operations Admin</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="rounded-2xl border p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-brand-orange/40 transition bg-surface"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-neutral-900 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {admin.firstName[0]?.toUpperCase() || "O"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                            {admin.firstName} {admin.lastName || ""}
                          </h4>
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                            Operations
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-neutral-400">Username:</span>
                          <code className="text-xs font-mono font-bold text-brand-orange">
                            {admin.username ? `@${admin.username}` : "none"}
                          </code>
                          {admin.hasPassword ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold ml-1">
                              Password set ✓
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-semibold ml-1">
                              Telegram only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResetModalUser(admin);
                          setNewPassword("");
                          setResetError(null);
                        }}
                        className="text-xs text-neutral-600 dark:text-neutral-300 hover:text-brand-orange rounded-xl"
                        title="Set or reset password"
                      >
                        🔑 Password
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokingId === admin.id}
                        onClick={() => handleRevoke(admin)}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                        title="Revoke admin access"
                      >
                        {revokingId === admin.id ? "..." : "Revoke"}
                      </Button>
                    </div>
                  </div>

                  {/* Details strip */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t text-[11px] text-neutral-500"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Telegram ID:</span>
                      <code className="font-mono font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        {admin.telegramUserId}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyTelegramId(admin.telegramUserId)}
                        title="Copy Telegram ID"
                        className="text-[10px] text-brand-orange hover:underline font-semibold"
                      >
                        {copiedId === admin.telegramUserId ? "Copied! ✓" : "Copy"}
                      </button>
                    </div>

                    <div>
                      {admin.lastLoginAt ? (
                        <span>
                          Active <RelativeTime value={admin.lastLoginAt} />
                        </span>
                      ) : (
                        <span className="text-neutral-400">Never logged in</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Instruction Banner */}
      <Card className="bg-gradient-to-br from-amber-500/5 via-surface to-surface border-amber-500/20">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">💡</span>
            <div className="text-xs space-y-1 text-neutral-600 dark:text-neutral-300">
              <p className="font-bold text-neutral-900 dark:text-neutral-100">
                How newly added Operations Admins sign in:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-neutral-500 dark:text-neutral-400">
                <li>
                  <strong>Username & Password:</strong> They visit <strong>taf-fuel-station-fuel-locator.vercel.app/admin</strong>, enter the <strong>Username</strong> and <strong>Password</strong> you gave them, and click Sign In.
                </li>
                <li>
                  <strong>Telegram:</strong> If their account is linked to Telegram, they can also tap <code>/admin</code> in <strong>@taf_fuel_bot</strong> to open the dashboard with 1 tap.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CREATE OPERATIONS ADMIN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-5 animate-in zoom-in-95 duration-150 bg-surface"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-base" style={{ color: "var(--text)" }}>
                  Add Operations Admin
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Create a new username and password for your staff member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {submitError}
              </div>
            )}

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setAddMode("credentials");
                  setSubmitError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition ${
                  addMode === "credentials"
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                🔑 Create Username & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode("search");
                  setSubmitError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition ${
                  addMode === "search"
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                🔍 From Bot Users
              </button>
            </div>

            {addMode === "credentials" ? (
              /* CREATE WITH USERNAME AND PASSWORD */
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold block">
                    Full Name <span className="text-neutral-400 font-normal">(e.g. Staff member name)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmed Mohammed"
                    value={manualFirstName}
                    onChange={(e) => setManualFirstName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold block">
                    Username for Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ahmed_ops"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange font-mono"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="block text-[11px] text-neutral-400">
                    They will type this username to sign in.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold block">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. taf2026!"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange font-mono"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="block text-[11px] text-neutral-400">
                    At least 4 characters. You can change this anytime.
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="font-bold block">
                    Telegram User ID <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 2074368152 (leave empty if none)"
                    value={manualTelegramId}
                    onChange={(e) => setManualTelegramId(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 rounded-xl border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange font-mono"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              </div>
            ) : (
              /* PROMOTE EXISTING BOT USER */
              <div className="space-y-3">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by name, @username, or Telegram ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>

                <div
                  className="max-h-48 overflow-y-auto space-y-1.5 border rounded-2xl p-1.5"
                  style={{ borderColor: "var(--border)" }}
                >
                  {searching ? (
                    <div className="p-4 text-center text-xs text-neutral-400">Searching bot users...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-400">
                      No users found.
                    </div>
                  ) : (
                    searchResults.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2 text-xs transition ${
                            isSelected
                              ? "bg-brand-orange/15 border border-brand-orange/40 text-neutral-900 dark:text-neutral-100"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate">
                              {u.firstName} {u.lastName || ""}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {u.username ? `@${u.username} · ` : ""}ID: {u.telegramUserId}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                              isSelected
                                ? "bg-brand-orange text-neutral-900"
                                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                            }`}
                          >
                            {isSelected ? "Selected ✓" : u.role}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedUser && (
                  <div className="space-y-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      Promote {selectedUser.firstName} ({selectedUser.username ? `@${selectedUser.username}` : selectedUser.telegramUserId})
                    </span>
                    <div>
                      <label className="font-bold block text-[11px] mb-1">
                        Optional Password:
                      </label>
                      <input
                        type="text"
                        placeholder="Create a password for this user (optional)"
                        value={selectedUserPassword}
                        onChange={(e) => setSelectedUserPassword(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-surface font-mono text-xs"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={submitting || (addMode === "credentials" ? !manualUsername.trim() || !manualPassword.trim() : !selectedUser)}
                onClick={handleAddAdmin}
                className="text-xs rounded-xl px-5 font-bold"
              >
                {submitting ? "Saving..." : "Create Admin Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-150 bg-surface"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-base" style={{ color: "var(--text)" }}>
                  Change Password
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set a new password for <strong>{resetModalUser.firstName}</strong> ({resetModalUser.username ? `@${resetModalUser.username}` : `ID ${resetModalUser.telegramUserId}`})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {resetError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold block">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Enter new password (min 4 chars)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange font-mono text-xs"
                style={{ borderColor: "var(--border)" }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={resettingPassword}
                onClick={() => setResetModalUser(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={resettingPassword || newPassword.trim().length < 4}
                onClick={handleResetPassword}
                className="text-xs rounded-xl px-4 font-bold"
              >
                {resettingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
