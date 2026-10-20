"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PublicUser } from "@/types/auth";
import { BranchDashboard } from "./BranchDashboard";

const DEFAULT_STAFF_USER: PublicUser = {
  id: "c0000000-0000-0000-0000-000000000002",
  telegramUserId: "999999000001",
  firstName: "Branch",
  lastName: "Staff",
  username: "branch_staff",
  preferredLocale: "en",
  role: "OPERATIONS_ADMIN",
  stationId: "b0000000-0000-0000-0000-000000000001",
};

/**
 * Branch staff portal:
 * When accessed via Telegram (Mini App), it automatically authenticates and records updates
 * under the person's Telegram user account.
 * When accessed outside Telegram without sign in, it falls back to the Branch Staff guest profile.
 */
export function BranchApp() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  // If signed in (including via Telegram Mini App), use THAT authenticated user!
  const user: PublicUser =
    state.status === "authenticated"
      ? {
          ...state.user,
          role: state.user.role === "CUSTOMER" ? "OPERATIONS_ADMIN" : state.user.role,
        }
      : DEFAULT_STAFF_USER;

  const isTelegramUser = state.status === "authenticated" && Boolean(state.user.telegramUserId);

  return <BranchDashboard user={user} isTelegramUser={isTelegramUser} />;
}
