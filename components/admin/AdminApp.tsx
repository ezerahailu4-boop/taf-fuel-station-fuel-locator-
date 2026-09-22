"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminDashboard } from "./AdminDashboard";

export function AdminApp() {
  const { state } = useAuth();
  const c = useTranslations("common");

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (state.status === "anonymous") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <LoginForm />
      </main>
    );
  }

  if (state.user.role !== "SUPER_ADMIN" && state.user.role !== "VIEWER") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4 rounded-3xl p-8 border shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <span className="text-4xl">🔒</span>
          <h1 className="text-xl font-bold">Access Restricted</h1>
          <p className="text-sm text-neutral-500">
            This portal is restricted to Super Administrators and Viewers. Your account is currently signed in as <strong>{state.user.role}</strong>.
          </p>
          {state.user.role === "BRANCH_ADMIN" && (
            <a
              href="/branch"
              className="inline-block rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-neutral-900"
            >
              Go to Branch Admin Portal
            </a>
          )}
        </div>
      </main>
    );
  }

  return <AdminDashboard user={state.user} />;
}
