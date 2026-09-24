import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/authz";
import { db } from "@/lib/db";

const NAV_ITEMS = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/abwesend", label: "Abwesend" },
  { href: "/staff/ueberfaellig", label: "Überfällig" },
  { href: "/staff/schueler", label: "Schüler" },
  { href: "/staff/historie", label: "Historie" },
  { href: "/staff/statistiken", label: "Statistiken" },
  { href: "/staff/nachrichten", label: "Nachrichten" },
  { href: "/staff/benachrichtigungen", label: "Benachrichtigungen" },
] as const;

/**
 * Mitarbeiter nutzen laut PROMPT.md Abschnitt 1 primär ein Tablet — eine
 * einfache Top-Navigation statt der Bottom-Tab-Bar der Schüler-Ansicht.
 */
export default async function StaffLayout({
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
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-accent min-h-11 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {item.label}
              {item.href === "/staff/benachrichtigungen" && unreadCount > 0 && (
                <span className="bg-status-absent text-status-absent-foreground ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {item.href === "/staff/nachrichten" && unreadMessages > 0 && (
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
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
