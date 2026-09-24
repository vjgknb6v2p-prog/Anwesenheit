import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/authz";
import { db } from "@/lib/db";

const NAV_ITEMS = [
  { href: "/admin", label: "Live-Übersicht" },
  { href: "/admin/schueler", label: "Schüler" },
  { href: "/admin/mitarbeiter", label: "Mitarbeiter" },
  { href: "/admin/abwesenheiten", label: "Abwesenheiten" },
  { href: "/admin/kalender", label: "Kalender" },
  { href: "/admin/statistiken", label: "Statistiken" },
  { href: "/admin/wochenbericht", label: "Wochenbericht" },
  { href: "/admin/nachrichten", label: "Nachrichten" },
  { href: "/admin/benachrichtigungen", label: "Benachrichtigungen" },
  { href: "/admin/audit", label: "Audit-Log" },
  { href: "/admin/wohnbereiche", label: "Wohnbereiche" },
  { href: "/admin/einstellungen", label: "Einstellungen" },
] as const;

/**
 * Admin-Bereich nutzt wie `/staff` eine Top-Navigation (Tablet/Desktop statt
 * Bottom-Tab-Bar).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `getSessionUser()` statt `requireRole()`: nur für die Badge-Zahl
  // (Abschnitt 8) — jede Seite prüft ihren Zugriff selbst (Abschnitt 5).
  const user = await getSessionUser();
  const [unreadCount, unreadMessages] = user
    ? await Promise.all([
        db.notification.count({ where: { userId: user.id, readAt: null } }),
        db.message.count({ where: { recipientId: user.id, readAt: null } }),
      ])
    : [0, 0];

  return (
    <div className="min-h-screen">
      <header className="border-b print:hidden">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-accent min-h-11 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {item.label}
              {item.href === "/admin/benachrichtigungen" && unreadCount > 0 && (
                <span className="bg-status-absent text-status-absent-foreground ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {item.href === "/admin/nachrichten" && unreadMessages > 0 && (
                <span className="bg-status-absent text-status-absent-foreground ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>
          ))}
          <form action={logoutAction} className="ml-auto">
            <Button type="submit" variant="outline" size="sm">
              Abmelden
            </Button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
