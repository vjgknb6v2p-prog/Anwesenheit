import type { Metadata } from "next";
import { DataExportLinks } from "@/components/data-export-links";
import { NotificationsList } from "@/components/notifications-list";
import { PushSubscriptionToggle } from "@/components/push-subscription-toggle";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Benachrichtigungen – CheckIn",
};

/**
 * In PROMPT.md Abschnitt 6 nicht einzeln als Mitarbeiter-Route gelistet,
 * aber operativ nötig: die Mitarbeiter-Sammelmeldung aus Abschnitt 8
 * ("3 Schüler sind aktuell überfällig.") landet als `Notification` für
 * Mitarbeiter — ohne eigene Seite gäbe es dafür keinen Zugriffspunkt. Siehe
 * docs/decisions.md.
 */
export default async function StaffNotificationsPage() {
  const staffUser = await requireRole("STAFF", "ADMIN");

  const notifications = await db.notification.findMany({
    where: { userId: staffUser.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Benachrichtigungen</h1>

      <PushSubscriptionToggle />
      <DataExportLinks />

      <NotificationsList notifications={notifications} />
    </div>
  );
}
