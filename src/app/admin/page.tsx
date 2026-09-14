import type { Metadata } from "next";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/authz";

export const metadata: Metadata = {
  title: "Admin – CheckIn",
};

export default async function AdminDashboardPage() {
  const user = await requireRole("ADMIN");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Hallo, {user.name}</h1>
        <p className="text-muted-foreground text-sm">Rolle: Admin</p>
      </div>
      <p className="text-muted-foreground max-w-sm text-sm">
        Die Live-Übersicht mit KPIs und Echtzeit-Tabelle folgt in der nächsten
        Ausbaustufe.
      </p>
      <form action={logoutAction}>
        <Button type="submit" variant="outline">
          Abmelden
        </Button>
      </form>
    </main>
  );
}
