import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { searchStudents } from "@/lib/search-queries";

export const metadata: Metadata = {
  title: "Suche – CheckIn",
};

/**
 * Erweiterung "Globale Suche": Mitarbeiter durchsuchen ausschließlich
 * Schüler (Name, E-Mail, Klasse, Zimmer) — Mitarbeiterverwaltung ist laut
 * Rechte-Matrix Admin-exklusiv, siehe `/admin/suche`.
 */
export default async function StaffSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("STAFF", "ADMIN");
  const { q } = await searchParams;
  const query = q ?? "";
  const results = query ? await searchStudents(query) : [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        Suche{query ? `: „${query}“` : ""}
      </h1>

      {!query ? (
        <p className="text-muted-foreground text-sm">
          Suche nach Name, E-Mail, Klasse oder Zimmer.
        </p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Treffer.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((result) => (
            <li key={result.id}>
              <Link
                href={`/staff/schueler/${result.id}`}
                className="hover:bg-accent flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">
                    {result.firstName} {result.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {result.email}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">Schüler</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
