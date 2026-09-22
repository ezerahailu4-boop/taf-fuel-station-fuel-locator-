"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { BranchDashboard } from "./BranchDashboard";

/** Auth gate for the branch UI: Telegram Mini App login is automatic; on the web the admin signs in with a bot code. */
export function BranchApp() {
  const { state } = useAuth();
  const c = useTranslations("common");

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
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
  if (state.user.role === "CUSTOMER") {
    return <p className="mx-auto max-w-md p-8 text-center">{c("readOnly")}</p>;
  }
  return <BranchDashboard user={state.user} />;
}
