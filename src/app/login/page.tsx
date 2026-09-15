import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden – CheckIn",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">CheckIn</h1>
        <p className="text-muted-foreground text-sm">
          Melde dich mit deinem Internats-Account an.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
