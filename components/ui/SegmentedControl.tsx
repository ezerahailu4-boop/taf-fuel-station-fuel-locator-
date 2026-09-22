"use client";

import { useId } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon: string;
  /** Tailwind classes applied when this option is selected. */
  activeClass: string;
}

/** Large, touch-friendly radio group (min 48px tall). Selection is shown by fill + icon + text. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  columns = 3,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  columns?: number;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex min-h-12 cursor-pointer select-none flex-col items-center justify-center rounded-xl border px-2 py-2 text-center text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-[var(--color-brand-orange)] ${
              active ? o.activeClass : "hover:bg-black/5"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            style={active ? undefined : { borderColor: "var(--border)" }}
          >
            <input type="radio" className="sr-only" name={name} checked={active} disabled={disabled} onChange={() => onChange(o.value)} />
            <span aria-hidden className="text-lg leading-none">{o.icon}</span>
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}
