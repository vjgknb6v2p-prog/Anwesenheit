import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/authz";
import { roleHomePath } from "@/lib/roles";

export const metadata: Metadata = {
  title: "CheckIn",
};

export default async function Home() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Nur Schüler bleiben auf "/" — Mitarbeiter und Admins landen auf ihrem
  // eigenen Bereich (PROMPT.md Abschnitt 6).
  if (user.role !== "STUDENT") {
    redirect(roleHomePath(user.role));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Hallo, {user.name}</h1>
        <p className="text-muted-foreground text-sm">Rolle: Schüler</p>
      </div>
      <p className="text-muted-foreground max-w-sm text-sm">
        Das Ausgangs-Dashboard (Aus-/Einchecken, Verlängern, Historie) folgt in
        der nächsten Ausbaustufe.
      </p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          Abmelden
        </Button>
      </form>
    </main>
  );
}
