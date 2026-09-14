import type { Metadata } from "next";
import { RequestResetForm } from "./request-reset-form";

export const metadata: Metadata = {
  title: "Passwort vergessen – CheckIn",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Passwort vergessen</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum
          Zurücksetzen deines Passworts.
        </p>
      </div>
      <RequestResetForm />
    </main>
  );
}
