import { AuthProvider } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/customer/BottomNav";
import { StationsProvider } from "@/components/customer/StationsProvider";
import { ThemeSync } from "@/components/customer/ThemeSync";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StationsProvider>
        <ThemeSync />
        <div className="mx-auto w-full max-w-xl pb-24 md:max-w-3xl">{children}</div>
        <BottomNav />
      </StationsProvider>
    </AuthProvider>
  );
}
