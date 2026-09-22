import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata = { title: "TAF Staff Sign In" };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
