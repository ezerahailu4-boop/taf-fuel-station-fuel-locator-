"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", key: "home", icon: "🏠" },
  { href: "/map", key: "map", icon: "🗺️" },
  { href: "/stations", key: "stations", icon: "⛽" },
  { href: "/alerts", key: "alerts", icon: "🔔" },
  { href: "/profile", key: "profile", icon: "👤" },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {ITEMS.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-[var(--color-brand-red-orange)]" : ""}`} style={active ? undefined : { color: "var(--muted)" }}>
                <span aria-hidden className={`text-xl leading-none ${active ? "" : "opacity-80"}`}>{i.icon}</span>
                <span>{t(i.key)}</span>
                {active && <span aria-hidden className="mt-0.5 h-1 w-6 rounded-full bg-brand-orange" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
