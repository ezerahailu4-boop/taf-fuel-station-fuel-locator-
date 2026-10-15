"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/client/api";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MegaphoneIcon,
  SendIcon,
  RefreshIcon,
  UsersIcon,
  BellIcon,
  CheckCircleIcon,
  GasStationIcon,
} from "@/components/ui/icons";
import type { StationItem } from "./StationsManager";

export interface BroadcastItem {
  id: string;
  titleEn: string;
  titleAm: string | null;
  bodyEn: string;
  bodyAm: string | null;
  createdAt: string;
  station?: {
    id: string;
    name: string;
    branchName: string;
    city: string;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    role: string;
  } | null;
  totalInApp: number;
  totalTelegram: number;
  telegramSent: number;
  telegramPending: number;
  telegramFailed: number;
  audience?: unknown;
}

export interface AudienceStats {
  totalUsers: number;
  telegramUsers: number;
  customers: number;
  staff: number;
}

export function BroadcastManager({ stations = [] }: { stations?: StationItem[] }) {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [audience, setAudience] = useState<AudienceStats>({
    totalUsers: 0,
    telegramUsers: 0,
    customers: 0,
    staff: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Form State
  const [titleEn, setTitleEn] = useState("");
  const [titleAm, setTitleAm] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyAm, setBodyAm] = useState("");
  const [targetAudience, setTargetAudience] = useState<"ALL" | "TELEGRAM_ONLY" | "CUSTOMERS" | "STAFF">("ALL");
  const [stationId, setStationId] = useState<string>("");
  const [sendTelegram, setSendTelegram] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [activeLangTab, setActiveLangTab] = useState<"en" | "am">("en");

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch<{
        audience: AudienceStats;
        broadcasts: BroadcastItem[];
      }>("/api/admin/broadcast");
      setAudience(res.audience);
      setBroadcasts(res.broadcasts);
    } catch (err) {
      console.error("[BroadcastManager] Error loading broadcast data:", err);
      setErrorMessage("Failed to load broadcast history and audience metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadData();
    });
  }, []);

  const getEstimatedRecipients = () => {
    if (targetAudience === "TELEGRAM_ONLY") return audience.telegramUsers;
    if (targetAudience === "CUSTOMERS") return audience.customers;
    if (targetAudience === "STAFF") return audience.staff;
    return audience.totalUsers;
  };

  const handleTemplateSelect = (type: "fuel" | "maintenance" | "general") => {
    if (type === "fuel") {
      setTitleEn("⛽ Fuel Restocked Notice");
      setTitleAm("⛽ የነዳጅ አቅርቦት መረጃ");
      setBodyEn("Fresh fuel shipment has arrived. Check available branches and live pump status directly in the app.");
      setBodyAm("አዲስ የነዳጅ አቅርቦት ደርሷል። ዝርዝር መረጃዎችን እና የፓምፕ ሁኔታን በመተግበሪያው ይመልከቱ።");
    } else if (type === "maintenance") {
      setTitleEn("⚠️ System & Pump Maintenance Notice");
      setTitleAm("⚠️ የፓምፕ ጥገና ማስታወቂያ");
      setBodyEn("Scheduled maintenance is underway for improved service reliability. We apologize for any inconvenience.");
      setBodyAm("ለተሻሻለ የአገልግሎት አስተማማኝነት የታቀደ የጥገና ሥራ እየተከናወነ ነው። ለተፈጠረው መስተጓጎል ይቅርታ እንጠይቃለን።");
    } else {
      setTitleEn("📢 Important Update from TAF");
      setTitleAm("📢 ጠቃሚ መረጃ ከታፍ");
      setBodyEn("We have exciting new features and expanded branch coverage to serve you better. Open the app to explore!");
      setBodyAm("እርስዎን በተሻለ ለማገልገል አዳዲስ አገልግሎቶች እና ተጨማሪ የማደያ ሽፋን አዘጋጅተናል። መተግበሪያውን ከፍተው ይመልከቱ!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim() || !bodyEn.trim()) {
      alert("Please provide both a Title and Message Body.");
      return;
    }
    if (!sendTelegram && !sendInApp) {
      alert("Please select at least one delivery channel (Telegram or In-App).");
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        recipientCount: number;
        telegramCount: number;
      }>("/api/admin/broadcast", {
        method: "POST",
        body: {
          titleEn: titleEn.trim(),
          titleAm: titleAm.trim() || undefined,
          bodyEn: bodyEn.trim(),
          bodyAm: bodyAm.trim() || undefined,
          targetAudience,
          stationId: stationId || null,
          sendTelegram,
          sendInApp,
        },
      });

      setSuccessMessage(
        `Broadcast successfully initiated! Sent to ${res.recipientCount} in-app recipients and ${res.telegramCount} Telegram users.`
      );

      // Reset form
      setTitleEn("");
      setTitleAm("");
      setBodyEn("");
      setBodyAm("");
      setStationId("");

      // Refresh list
      loadData();
    } catch (err: unknown) {
      console.error("[BroadcastManager] Failed to send broadcast:", err);
      const msg = err instanceof Error ? err.message : "Failed to deliver broadcast message.";
      setErrorMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const selectedStationObj = stations.find((s) => s.id === stationId);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <MegaphoneIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Broadcast Messages</span>
                <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                  መልእክት ማሰራጫ
                </Badge>
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Send push announcements directly to all Telegram bot users and In-App alert notifications.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="gap-2 shrink-0 cursor-pointer"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Audience Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Users
              </p>
              <p className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                {loading ? "..." : audience.totalUsers.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <SendIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Telegram Bot Users
              </p>
              <p className="text-xl font-black text-sky-600 dark:text-sky-400">
                {loading ? "..." : audience.telegramUsers.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <BellIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Customers
              </p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                {loading ? "..." : audience.customers.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Past Broadcasts
              </p>
              <p className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                {loading ? "..." : broadcasts.length.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Composer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-2 border border-neutral-200/80 dark:border-neutral-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-black">Compose Broadcast</CardTitle>
                <CardDescription className="text-xs">
                  Create an announcement to dispatch immediately to active users.
                </CardDescription>
              </div>

              {/* Quick Template Buttons */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Templates:</span>
                <button
                  type="button"
                  onClick={() => handleTemplateSelect("fuel")}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  ⛽ Fuel Arrival
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateSelect("maintenance")}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 transition cursor-pointer"
                >
                  ⚠️ Maintenance
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateSelect("general")}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition cursor-pointer"
                >
                  📢 General
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Audience & Channel Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full text-xs font-semibold rounded-xl border p-2 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  >
                    <option value="ALL">All Users ({audience.totalUsers} registered)</option>
                    <option value="TELEGRAM_ONLY">Telegram Bot Users Only ({audience.telegramUsers} users)</option>
                    <option value="CUSTOMERS">Customers Only ({audience.customers} drivers)</option>
                    <option value="STAFF">Staff & Station Admins ({audience.staff} staff)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Delivery Channels
                  </label>
                  <div className="flex items-center gap-4 pt-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendTelegram}
                        onChange={(e) => setSendTelegram(e.target.checked)}
                        className="rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span>Telegram Bot Push</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendInApp}
                        onChange={(e) => setSendInApp(e.target.checked)}
                        className="rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span>In-App Alerts (🔔)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Language Switcher Tabs */}
              <div className="flex border-b border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveLangTab("en")}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeLangTab === "en"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  🇬🇧 English Message
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab("am")}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeLangTab === "am"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  🇪🇹 Amharic (አማርኛ)
                </button>
              </div>

              {/* Inputs based on active tab */}
              {activeLangTab === "en" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Title (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="e.g. ⛽ Benzine Stock Updated at Bole Branch"
                      maxLength={140}
                      className="w-full text-sm rounded-xl border p-2.5 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Message Body (English) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-neutral-400">{bodyEn.length}/2000</span>
                    </div>
                    <textarea
                      value={bodyEn}
                      onChange={(e) => setBodyEn(e.target.value)}
                      rows={4}
                      placeholder="Type your announcement or update for users here..."
                      maxLength={2000}
                      className="w-full text-sm rounded-xl border p-2.5 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      ርዕስ (አማርኛ)
                    </label>
                    <input
                      type="text"
                      value={titleAm}
                      onChange={(e) => setTitleAm(e.target.value)}
                      placeholder="ምሳሌ፡ ⛽ የቤንዚን አቅርቦት በቦሌ ማደያ ገብቷል"
                      maxLength={140}
                      className="w-full text-sm rounded-xl border p-2.5 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        መልእክት (አማርኛ)
                      </label>
                      <span className="text-[10px] text-neutral-400">{bodyAm.length}/2000</span>
                    </div>
                    <textarea
                      value={bodyAm}
                      onChange={(e) => setBodyAm(e.target.value)}
                      rows={4}
                      placeholder="የመልእክቱን ዝርዝር እዚህ ይፃፉ..."
                      maxLength={2000}
                      className="w-full text-sm rounded-xl border p-2.5 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                </div>
              )}

              {/* Optional Station Link */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Attach Specific Station (Optional)
                </label>
                <select
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border p-2.5 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                >
                  <option value="">No specific station (General Announcement)</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      TAF {s.branchName} ({s.city})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400 mt-1">
                  When selected, the Telegram message button opens this station directly with GPS directions.
                </p>
              </div>

              {/* Action row */}
              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  Targeting approx. <strong className="text-neutral-900 dark:text-neutral-100">{getEstimatedRecipients()}</strong> recipients
                </p>

                <Button
                  type="submit"
                  disabled={sending || !titleEn.trim() || !bodyEn.trim()}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-bold hover:brightness-105 cursor-pointer shadow-md"
                >
                  <SendIcon className="w-4 h-4" />
                  <span>Send Broadcast</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview Card */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Live Telegram Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Telegram message bubble simulation */}
            <div className="rounded-2xl p-4 bg-[#182533] text-white shadow-md border border-neutral-700/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <span>🤖 TAF Fuel Finder Bot</span>
              </div>
              <p className="text-sm font-bold text-neutral-100">
                📢 {activeLangTab === "am" && titleAm ? titleAm : titleEn || "Title of Announcement"}
              </p>
              <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {activeLangTab === "am" && bodyAm ? bodyAm : bodyEn || "Your announcement message body will appear here to users on Telegram..."}
              </p>

              {/* Simulated button */}
              <div className="pt-2">
                <div className="w-full py-2 px-3 rounded-xl bg-[#2b5278] hover:bg-[#346290] text-center text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 shadow-sm">
                  <span>⛽</span>
                  <span>
                    {selectedStationObj
                      ? `View TAF ${selectedStationObj.branchName}`
                      : "Open TAF Fuel Finder"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>💡</span> Notice
              </p>
              <p className="text-[11px] leading-snug">
                Telegram messages are delivered immediately using the bot. In-app alerts will be stored in the database for each user&apos;s Notification Inbox.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast History Table */}
      <Card className="border border-neutral-200/80 dark:border-neutral-800">
        <CardHeader>
          <CardTitle className="text-base font-black">Broadcast History</CardTitle>
          <CardDescription className="text-xs">
            Previous messages dispatched to users with delivery stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              <MegaphoneIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-bold">No broadcasts sent yet</p>
              <p className="text-xs text-neutral-400">Use the form above to send your first message to all users.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Title & Message</th>
                    <th className="py-2.5 px-3">Station</th>
                    <th className="py-2.5 px-3">Sent By</th>
                    <th className="py-2.5 px-3">Delivery Status</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {broadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition">
                      <td className="py-3 px-3 max-w-xs">
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {b.titleEn}
                        </p>
                        {b.titleAm && (
                          <p className="text-[11px] text-neutral-500 truncate">{b.titleAm}</p>
                        )}
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">{b.bodyEn}</p>
                      </td>

                      <td className="py-3 px-3">
                        {b.station ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
                            <GasStationIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>TAF {b.station.branchName}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400">All / General</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {b.createdBy ? (
                          <div>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {b.createdBy.firstName} {b.createdBy.lastName || ""}
                            </span>
                            {b.createdBy.username && (
                              <span className="block text-[10px] text-neutral-400">@{b.createdBy.username}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">System</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20">
                              Telegram: {b.telegramSent} sent
                            </Badge>
                            {b.telegramFailed > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                                {b.telegramFailed} failed
                              </Badge>
                            )}
                          </div>
                          <span className="block text-[10px] text-neutral-400">
                            In-App: {b.totalInApp} delivered
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-neutral-500 whitespace-nowrap">
                        <RelativeTime value={b.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <MegaphoneIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">
                  Confirm Broadcast Dispatch
                </h3>
                <p className="text-xs text-neutral-500">
                  Are you sure you want to broadcast this message?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 text-xs space-y-2">
              <p>
                <strong className="text-neutral-500">Title:</strong> {titleEn}
              </p>
              <p>
                <strong className="text-neutral-500">Audience:</strong> {targetAudience} (approx. {getEstimatedRecipients()} users)
              </p>
              <p>
                <strong className="text-neutral-500">Channels:</strong>{" "}
                {[sendTelegram && "Telegram Bot", sendInApp && "In-App Alerts"].filter(Boolean).join(" & ")}
              </p>
            </div>

            <p className="text-xs text-neutral-500">
              This message will be dispatched immediately to all targeted users.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSend}
                disabled={sending}
                className="bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 cursor-pointer"
              >
                {sending ? "Sending..." : "Yes, Broadcast Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
