"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error caught by error.tsx]:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-neutral-900 text-white">
      <div className="relative mb-6 h-20 w-20">
        <Image
          src="/brand/taf-logo.webp"
          alt="TAF Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <h1 className="text-xl font-black mb-2 text-amber-400">ነዳጅ አለ</h1>
      <p className="text-sm text-neutral-300 max-w-xs mb-6">
        Something unexpected occurred while loading the fuel station finder.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 active:scale-95 transition cursor-pointer"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl font-bold bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:scale-95 transition cursor-pointer"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
