"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/Skeleton";

export function LoginPageClient() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "authenticated") {
      if (state.user.role === "SUPER_ADMIN" || state.user.role === "VIEWER") {
        router.replace("/admin");
      } else if (state.user.role === "BRANCH_ADMIN") {
        router.replace("/branch");
      } else {
        router.replace("/");
      }
    }
  }, [state, router]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
