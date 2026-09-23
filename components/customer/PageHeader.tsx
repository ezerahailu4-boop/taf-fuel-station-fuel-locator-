"use client";

import Image from "next/image";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

import { NotificationCenter } from "@/components/customer/NotificationCenter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: { href: string; label: string } }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          <Link href={back.href} aria-label={back.label} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border text-xl" style={{ borderColor: "var(--border)" }}>
            ←
          </Link>
        ) : (
          <div className="rounded-xl bg-white p-1.5 ring-1 ring-black/5">
            <Image src="/brand/taf-logo.webp" alt="TAF" width={36} height={36} priority />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm" style={{ color: "var(--muted)" }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <NotificationCenter />
        <LocaleSwitcher />
      </div>
    </header>
  );
}
