import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/abwesend", label: "Abwesend" },
  { href: "/staff/ueberfaellig", label: "Überfällig" },
  { href: "/staff/schueler", label: "Schüler" },
  { href: "/staff/historie", label: "Historie" },
  { href: "/staff/statistiken", label: "Statistiken" },
] as const;

/**
 * Mitarbeiter nutzen laut PROMPT.md Abschnitt 1 primär ein Tablet — eine
 * einfache Top-Navigation statt der Bottom-Tab-Bar der Schüler-Ansicht.
 */
export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
