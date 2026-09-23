import Image from "next/image";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/customer/BottomNav";
import { StationsProvider } from "@/components/customer/StationsProvider";
import { ThemeSync } from "@/components/customer/ThemeSync";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StationsProvider>
        <ThemeSync />

        {/* Ambient brand glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-amber-500/12 via-orange-500/4 to-transparent blur-3xl z-0"
        />

        {/* TAF Logo Ambient Background Watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 flex items-center justify-center select-none overflow-hidden z-0"
        >
          <Image
            src="/brand/taf-logo.webp"
            alt=""
            width={520}
            height={520}
            priority
            className="opacity-[0.08] dark:opacity-[0.05] [[data-theme=taf]_&]:opacity-[0.16] [[data-theme=taf]_&]:scale-110 filter blur-[0.4px] object-contain transition-all duration-300"
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl pb-24 md:max-w-3xl">{children}</div>
        <BottomNav />
      </StationsProvider>
    </AuthProvider>
  );
}
