import { BottomNav } from "@/components/bottom-nav";
import { getSessionUser } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `getSessionUser()` statt `requireRole()`: Diese Layout-weite Abfrage
  // dient nur der Badge-Zahl auf der Glocke (Abschnitt 8, "Glocke mit
  // Badge") — die eigentliche Zugriffsprüfung übernimmt jede Seite selbst
  // per `requireRole("STUDENT")` als erste Zeile (Abschnitt 5).
  const user = await getSessionUser();
  const unreadCount = user
    ? await db.notification.count({
        where: { userId: user.id, readAt: null },
      })
    : 0;

  return (
    <>
      {children}
      <BottomNav unreadCount={unreadCount} />
    </>
  );
}
