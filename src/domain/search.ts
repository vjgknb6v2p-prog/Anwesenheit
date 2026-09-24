/**
 * Erweiterung "Globale Suche": bewertet und sortiert Treffer aus einer
 * (bereits von der DB grob gefilterten, siehe `src/lib/search-queries.ts`)
 * Kandidatenliste nach Relevanz — exakte Namenstreffer und
 * Präfix-Übereinstimmungen zuerst, sonstige Teilstring-Treffer zuletzt.
 * Reine Funktion ohne I/O, damit die Rangfolge unit-testbar ist.
 */
export type SearchResultKind = "STUDENT" | "STAFF";

export interface SearchCandidate {
  id: string;
  kind: SearchResultKind;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SearchResult extends SearchCandidate {
  score: number;
}

const SCORE_EXACT_NAME = 100;
const SCORE_NAME_STARTS_WITH = 80;
const SCORE_LASTNAME_STARTS_WITH = 70;
const SCORE_EMAIL_STARTS_WITH = 60;
const SCORE_NAME_CONTAINS = 40;
const SCORE_EMAIL_CONTAINS = 30;
/** Treffer über ein anderes Feld (z. B. Klasse/Zimmer) als Name/E-Mail. */
const SCORE_OTHER_MATCH = 10;

function computeScore(
  candidate: SearchCandidate,
  normalizedQuery: string,
): number {
  if (!normalizedQuery) {
    return SCORE_OTHER_MATCH;
  }
  const fullName = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
  const lastName = candidate.lastName.toLowerCase();
  const email = candidate.email.toLowerCase();

  if (fullName === normalizedQuery) {
    return SCORE_EXACT_NAME;
  }
  if (fullName.startsWith(normalizedQuery)) {
    return SCORE_NAME_STARTS_WITH;
  }
  if (lastName.startsWith(normalizedQuery)) {
    return SCORE_LASTNAME_STARTS_WITH;
  }
  if (email.startsWith(normalizedQuery)) {
    return SCORE_EMAIL_STARTS_WITH;
  }
  if (fullName.includes(normalizedQuery)) {
    return SCORE_NAME_CONTAINS;
  }
  if (email.includes(normalizedQuery)) {
    return SCORE_EMAIL_CONTAINS;
  }
  return SCORE_OTHER_MATCH;
}

/**
 * Sortiert Kandidaten absteigend nach Relevanz zur Suchanfrage (Gleichstand:
 * alphabetisch nach Nachname). Schließt nie Kandidaten aus — die DB-Abfrage
 * hat bereits gefiltert (z. B. Treffer über Klasse/Zimmer), diese Funktion
 * ordnet nur.
 */
export function rankSearchResults(
  candidates: readonly SearchCandidate[],
  query: string,
): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: computeScore(candidate, normalizedQuery),
    }))
    .sort(
      (a, b) => b.score - a.score || a.lastName.localeCompare(b.lastName, "de"),
    );
}
