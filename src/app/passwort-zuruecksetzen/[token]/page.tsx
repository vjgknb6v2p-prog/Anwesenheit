import type { Metadata } from "next";
import Link from "next/link";
import { findValidPasswordResetToken } from "@/lib/tokens";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Passwort zurücksetzen – CheckIn",
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resetToken = await findValidPasswordResetToken(token);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Passwort zurücksetzen</h1>
      </div>
      {resetToken ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-sm">
            Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen Link
            an.
          </p>
          <Link
            href="/passwort-vergessen"
            className="text-sm underline underline-offset-4"
          >
            Neuen Link anfordern
          </Link>
        </div>
      )}
    </main>
  );
}
