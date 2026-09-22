"use client";

import { useEffect, useRef } from "react";

/** Native <dialog>: focus trap, Escape to close and backdrop come for free. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-3xl p-0 shadow-xl backdrop:bg-black/50"
      style={{ background: "var(--surface)", color: "var(--text)" }}
    >
      <div className="space-y-4 p-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <div>{children}</div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-12 rounded-xl border px-4 font-semibold" style={{ borderColor: "var(--border)" }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="min-h-12 rounded-xl bg-brand-orange px-4 font-semibold text-neutral-900 disabled:opacity-60">
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
