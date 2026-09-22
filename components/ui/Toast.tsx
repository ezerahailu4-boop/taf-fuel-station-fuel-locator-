"use client";

import { useEffect } from "react";

export interface ToastMessage {
  kind: "success" | "error";
  text: string;
}

export function Toast({ toast, onDone }: { toast: ToastMessage | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDone, 3500);
    return () => clearTimeout(id);
  }, [toast, onDone]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto max-w-md rounded-2xl px-5 py-3 text-base font-medium shadow-lg ${
            toast.kind === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"
          }`}
        >
          {toast.kind === "success" ? "✓ " : "⚠ "}
          {toast.text}
        </div>
      )}
    </div>
  );
}
