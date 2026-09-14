import type { Metadata } from "next";
import { NotificationsList } from "@/components/notifications-list";
import { PushSubscriptionToggle } from "@/components/push-subscription-toggle";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Benachrichtigungen – CheckIn",
};

export default async function AdminNotificationsPage() {
  const admin = await requireRole("ADMIN");

  const [notifications, pushSubscriptionCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: admin.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.pushSubscription.count(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Benachrichtigungen</h1>

      <div className="rounded-2xl border p-4 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Registrierte Push-Abonnements (alle Nutzer)
        </p>
        <p className="text-2xl font-semibold">{pushSubscriptionCount}</p>
      </div>

      <PushSubscriptionToggle />

      <NotificationsList notifications={notifications} />
    </div>
  );
}
