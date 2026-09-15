import type { Role } from "@prisma/client";

/**
 * PROMPT.md Abschnitt 6: "Root-Route / leitet rollenabhängig weiter." Schüler
 * bleiben auf `/` (das ist ihr Dashboard), Mitarbeiter und Admins werden auf
 * ihren eigenen Bereich weitergeleitet. Reine Funktion ohne Session-/DB-Zugriff,
 * damit sie sowohl in der Edge-Middleware (`auth.config.ts`) als auch in
 * Server Components verwendet werden kann.
 */
export function roleHomePath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "STAFF":
      return "/staff";
    case "STUDENT":
      return "/";
  }
}
