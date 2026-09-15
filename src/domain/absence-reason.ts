/**
 * PROMPT.md Abschnitt 4: feste Abwesenheitsgründe als Enum im Code (nicht
 * Freitext). Die Datenbankspalte `absences.reason` bleibt laut Vorgabe ein
 * `String` — diese Liste ist die einzige Quelle der Wahrheit dafür, welche
 * Werte gültig sind, und wird von der Zod-Validierung der Server Actions
 * (ab Phase 2) sowie von `prisma/seed.ts` verwendet.
 */
export const ABSENCE_REASONS = [
  "HEIMFAHRT",
  "ARZT",
  "SPORT_VEREIN",
  "EINKAUF_STADT",
  "FAMILIE_BESUCH",
  "SCHULVERANSTALTUNG",
  "SONSTIGES",
] as const;

export type AbsenceReason = (typeof ABSENCE_REASONS)[number];
