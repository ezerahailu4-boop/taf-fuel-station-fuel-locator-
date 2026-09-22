import { AuthProvider } from "@/components/auth/AuthProvider";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
