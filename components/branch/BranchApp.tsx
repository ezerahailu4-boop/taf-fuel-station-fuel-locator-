"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PublicUser } from "@/types/auth";
import { BranchDashboard } from "./BranchDashboard";

const DEFAULT_STAFF_USER: PublicUser = {
  id: "c0000000-0000-0000-0000-000000000001",
  telegramUserId: "2074368152",
  firstName: "Branch",
  lastName: "Staff",
  username: "taf_staff",
  preferredLocale: "en",
  role: "SUPER_ADMIN",
  stationId: "b0000000-0000-0000-0000-000000000001",
};

/**
 * Passwordless branch staff portal:
 * Anyone opening /branch can immediately view and update station fuel availability
 * without entering a password or OTP code.
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

  // If signed in with an administrative role, use that user; otherwise use the default staff user
  const user: PublicUser =
    state.status === "authenticated" && (state.user.role === "SUPER_ADMIN" || state.user.role === "BRANCH_ADMIN" || state.user.role === "VIEWER")
      ? state.user
      : DEFAULT_STAFF_USER;

  return <BranchDashboard user={user} />;
}
