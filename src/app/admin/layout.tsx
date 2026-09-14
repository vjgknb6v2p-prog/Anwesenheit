import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Live-Übersicht" },
  { href: "/admin/schueler", label: "Schüler" },
  { href: "/admin/mitarbeiter", label: "Mitarbeiter" },
  { href: "/admin/abwesenheiten", label: "Abwesenheiten" },
  { href: "/admin/statistiken", label: "Statistiken" },
  { href: "/admin/audit", label: "Audit-Log" },
  { href: "/admin/wohnbereiche", label: "Wohnbereiche" },
  { href: "/admin/einstellungen", label: "Einstellungen" },
] as const;

/**
 * Admin-Bereich nutzt wie `/staff` eine Top-Navigation (Tablet/Desktop statt
 * Bottom-Tab-Bar). Die Navigation verlinkt bewusst nur Seiten, die in dieser
 * Phase existieren — `/admin/benachrichtigungen` (Phase 6) ist laut
 * PROMPT.md Abschnitt 6 zwar für den Admin-Bereich vorgesehen, aber erst in
 * einer späteren Phase dran (siehe docs/decisions.md: keine
 * Platzhalter-Navigationseinträge).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-accent min-h-11 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {item.label}
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
