import { markNotificationReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface NotificationListItem {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * Gemeinsame Darstellung für die Benachrichtigungs-Inbox aller drei Rollen
 * (`/benachrichtigungen`, `/staff/benachrichtigungen`,
 * `/admin/benachrichtigungen` — siehe docs/decisions.md) — dieselbe Liste,
 * nur jeweils mit den eigenen Benachrichtigungen des angemeldeten Nutzers
 * bestückt (Abschnitt 3.8: kein Zugriff auf fremde Daten).
 */
export function NotificationsList({
  notifications,
}: {
  notifications: NotificationListItem[];
}) {
  if (notifications.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Keine Benachrichtigungen vorhanden.
      </p>
    );
  }

  return (
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
                action={markNotificationReadAction.bind(null, notification.id)}
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
  );
}
