import type { Metadata } from "next";
import Link from "next/link";
import type { SearchResult } from "@/domain/search";
import { requireRole } from "@/lib/authz";
import { searchStaff, searchStudents } from "@/lib/search-queries";

export const metadata: Metadata = {
  title: "Suche – CheckIn",
};

/**
 * Erweiterung "Globale Suche": Admin durchsucht Schüler **und** Mitarbeiter
 * gleichzeitig. Da Bearbeiten weiterhin über die Listen-Sheets auf
 * `/admin/schueler`/`/admin/mitarbeiter` läuft (kein eigenes Detail-Layout
 * für Admin), verlinken Treffer dorthin mit vorausgefülltem `?q=` statt auf
 * eine eigene Detailseite (siehe docs/decisions.md).
 */
export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("ADMIN");
  const { q } = await searchParams;
  const query = q ?? "";

  const [students, staff] = query
    ? await Promise.all([searchStudents(query), searchStaff(query)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">
        Suche{query ? `: „${query}“` : ""}
      </h1>

      {!query ? (
        <p className="text-muted-foreground text-sm">
          Suche nach Name oder E-Mail (Schüler zusätzlich nach Klasse/Zimmer).
        </p>
      ) : students.length === 0 && staff.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Treffer.</p>
      ) : (
        <>
          <ResultSection
            title="Schüler"
            results={students}
            href={`/admin/schueler?q=${encodeURIComponent(query)}`}
          />
          <ResultSection
            title="Mitarbeiter"
            results={staff}
            href={`/admin/mitarbeiter?q=${encodeURIComponent(query)}`}
          />
        </>
      )}
    </div>
  );
}

function ResultSection({
  title,
  results,
  href,
}: {
  title: string;
  results: SearchResult[];
  href: string;
}) {
  if (results.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">
        {title} ({results.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {results.map((result) => (
          <li key={result.id}>
            <Link
              href={href}
              className="hover:bg-accent flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
            >
              <div>
                <p className="font-medium">
                  {result.firstName} {result.lastName}
                </p>
                <p className="text-muted-foreground text-sm">{result.email}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
