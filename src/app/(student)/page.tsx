import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { roleHomePath } from "@/lib/roles";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "CheckIn",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  // Nur Schüler bleiben auf "/" — Mitarbeiter und Admins landen auf ihrem
  // eigenen Bereich (PROMPT.md Abschnitt 6).
  if (user.role !== "STUDENT") {
    redirect(roleHomePath(user.role));
  }

  const [dbUser, activeAbsence, recentAbsences, settings] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { firstName: true } }),
    db.absence.findFirst({ where: { userId: user.id, status: "ACTIVE" } }),
    db.absence.findMany({
      where: { userId: user.id },
      orderBy: { checkedOutAt: "desc" },
      take: 20,
      select: { destination: true },
    }),
    getSettings(),
  ]);

  const recentDestinations = Array.from(
    new Set(recentAbsences.map((absence) => absence.destination)),
  ).slice(0, 5);

  return (
    <DashboardClient
      firstName={dbUser?.firstName ?? ""}
      activeAbsence={
        activeAbsence
          ? {
              checkedOutAt: activeAbsence.checkedOutAt.toISOString(),
              plannedReturnAt: activeAbsence.plannedReturnAt.toISOString(),
              destination: activeAbsence.destination,
            }
          : null
      }
      recentDestinations={recentDestinations}
      curfewTime={settings.curfewTime}
    />
  );
}
