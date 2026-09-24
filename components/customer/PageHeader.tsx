"use client";

import Image from "next/image";
import Link from "next/link";
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
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
}) {
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
              className="flex shrink-0 items-center gap-1 rounded-2xl border p-1 shadow-2xs transition-all hover:scale-[1.02]"
              style={{
                background: "var(--bg)",
                borderColor: "var(--border)",
              }}
            >
              {/* TAF Oil Official Emblem */}
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white p-1 shadow-xs ring-1 ring-black/5 dark:bg-neutral-800">
                <Image
                  src="/brand/taf-logo.webp"
                  alt="TAF"
                  width={26}
                  height={26}
                  priority
                  className="object-contain"
                />
              </div>

              {/* Subtle vertical divider */}
              <div className="h-4 w-px bg-neutral-300/80 dark:bg-neutral-700/80" />

              {/* Fuel Ale (ነዳጅ አለ) Brand Mark beside TAF Logo */}
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white p-0.5 shadow-xs ring-1 ring-black/5 dark:bg-neutral-800">
                <Image
                  src="/brand/fuel-ale-logo.png"
                  alt="ነዳጅ አለ"
                  width={28}
                  height={28}
                  priority
                  className="object-contain"
                />
              </div>
            </div>
          )}
          <div className="min-w-0">
            <h1
              className="truncate text-base sm:text-lg font-black tracking-tight leading-tight"
              style={{ color: "var(--text)" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="truncate text-[11px] sm:text-xs font-medium"
                style={{ color: "var(--muted)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
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
