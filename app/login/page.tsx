import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "TAF Staff Sign In" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
