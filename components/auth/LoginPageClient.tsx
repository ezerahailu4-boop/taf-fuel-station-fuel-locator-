"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/Skeleton";

import Image from "next/image";

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

  return (
    <main
      className="relative flex min-h-dvh items-center justify-center p-4 overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Ambient Radial Brand Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent blur-3xl z-0"
      />

      {/* TAF Logo Ambient Watermark Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center select-none overflow-hidden z-0"
      >
        <Image
          src="/brand/taf-logo.webp"
          alt=""
          width={640}
          height={640}
          priority
          className="opacity-[0.06] dark:opacity-[0.04] scale-110 filter blur-[0.5px] object-contain"
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {state.status === "loading" ? (
          <div className="w-full space-y-4 rounded-3xl p-7 border shadow-xl backdrop-blur-md" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <Skeleton className="h-12 w-3/4 rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
