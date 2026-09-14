import type { Metadata } from "next";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Profil – CheckIn",
};

export default async function ProfilePage() {
  const user = await requireRole("STUDENT");

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      schoolClass: true,
      room: true,
      residentialArea: { select: { name: true } },
    },
  });

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6 pb-28">
      <h1 className="text-xl font-semibold">Profil</h1>

      <dl className="flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
        <ProfileRow label="Name">
          {profile ? `${profile.firstName} ${profile.lastName}` : "–"}
        </ProfileRow>
        <ProfileRow label="E-Mail">{profile?.email ?? "–"}</ProfileRow>
        <ProfileRow label="Klasse">{profile?.schoolClass ?? "–"}</ProfileRow>
        <ProfileRow label="Zimmer">{profile?.room ?? "–"}</ProfileRow>
        <ProfileRow label="Wohnbereich">
          {profile?.residentialArea?.name ?? "–"}
        </ProfileRow>
      </dl>

      <div className="flex flex-col gap-2 rounded-2xl border p-4 shadow-sm">
        <p className="text-sm font-medium">Darstellung</p>
        <ThemeToggle />
      </div>

      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Abmelden
        </Button>
      </form>
    </main>
  );
}

function ProfileRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
