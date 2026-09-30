"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { NotificationCenter } from "@/components/customer/NotificationCenter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
}: {
  title?: string;
  subtitle?: string;
  back?: { href: string; label: string };
}) {
  useEffect(() => {
    if (title && typeof document !== "undefined") {
      document.title = title;
    }
  }, [title]);

  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-200" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <Link
              href={back.href}
              aria-label={back.label}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 shadow-2xs"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            >
              <ChevronLeftIcon className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
            </Link>
          ) : (
            <div
              className="flex shrink-0 items-center gap-2.5 rounded-2xl border p-1.5 shadow-2xs transition-all hover:scale-[1.01]"
              style={{
                background: "var(--bg)",
                borderColor: "var(--border)",
              }}
            >
              {/* TAF Oil Official Emblem */}
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs ring-1 ring-black/5">
                <Image
                  src="/brand/taf-logo.webp"
                  alt="TAF"
                  width={34}
                  height={34}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Subtle vertical divider */}
              <div className="h-7 w-px bg-neutral-200 dark:bg-neutral-700" />

              {/* Fuel Ale (ነዳጅ አለ) Brand Mark - Prominently Sized & Crisp White Contrast */}
              <div className="flex h-13 w-16 sm:h-14 sm:w-18 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs ring-1 ring-emerald-500/30 transition-transform">
                <Image
                  src="/brand/fuel-ale-logo.png"
                  alt="ነዳጅ አለ"
                  width={72}
                  height={56}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}
          {(title || subtitle) && (
            <div className="min-w-0">
              {title && (
                <h1
                  className="truncate text-base sm:text-lg font-black tracking-tight leading-tight"
                  style={{ color: "var(--text)" }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p
                  className="truncate text-[11px] sm:text-xs font-medium"
                  style={{ color: "var(--muted)" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeToggle />
          <NotificationCenter />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
