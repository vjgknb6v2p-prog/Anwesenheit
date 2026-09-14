import type { Metadata } from "next";
import { markNotificationReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

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

      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Benachrichtigungen vorhanden.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={cn(
                "rounded-2xl border p-4 shadow-sm",
                !notification.readAt && "border-status-info",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {notification.message}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDateTime(notification.createdAt)} Uhr
                  </p>
                </div>
                {!notification.readAt && (
                  <form
                    action={markNotificationReadAction.bind(
                      null,
                      notification.id,
                    )}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      Gelesen
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
