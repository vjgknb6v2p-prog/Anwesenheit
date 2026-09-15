import type { Metadata } from "next";
import { InstallPromptBanner } from "@/components/install-prompt-banner";
import { NotificationsList } from "@/components/notifications-list";
import { PushSubscriptionToggle } from "@/components/push-subscription-toggle";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Benachrichtigungen – CheckIn",
};

export default async function NotificationsPage() {
  const user = await requireRole("STUDENT");

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="flex min-h-screen flex-col gap-4 p-6 pb-28">
      <h1 className="text-xl font-semibold">Benachrichtigungen</h1>

      <InstallPromptBanner />
      <PushSubscriptionToggle />

      <NotificationsList notifications={notifications} />
    </main>
  );
}
