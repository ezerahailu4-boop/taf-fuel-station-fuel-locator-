import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata = { title: "TAF Super Admin Portal" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
