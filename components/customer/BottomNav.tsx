"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MapIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" x2="9" y1="3" y2="18" />
      <line x1="15" x2="15" y1="6" y2="21" />
    </svg>
  );
}

function StationIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22h12" />
      <path d="M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18" />
      <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L19 6" />
      <path d="M7 6h4" />
      <path d="M7 10h4" />
    </svg>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const ITEMS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/map", key: "map", Icon: MapIcon },
  { href: "/stations", key: "stations", Icon: StationIcon },
  { href: "/alerts", key: "alerts", Icon: BellIcon },
  { href: "/profile", key: "profile", Icon: UserIcon },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const path = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl transition-colors duration-200"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))",
      }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 py-1">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.Icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-1 text-[11px] font-bold transition-all active:scale-95 ${
                  active
                    ? "text-brand-orange"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-brand-orange/15 text-brand-orange scale-105"
                      : "text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                  }`}
                >
                  <Icon className="h-5 w-5 transition-transform" />
                </div>
                <span className="leading-tight tracking-tight text-[11px]">
                  {t(item.key)}
                </span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-1 h-0.5 w-6 rounded-full bg-brand-orange shadow-sm shadow-brand-orange/50 animate-in fade-in zoom-in-75 duration-200"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
