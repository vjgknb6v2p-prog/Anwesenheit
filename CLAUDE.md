# CLAUDE.md

Diese Datei ist die zentrale Referenz für die Arbeit an **CheckIn** (Internats-Ausgangsverwaltung).
Der vollständige, bindende Projektauftrag steht in [`PROMPT.md`](./PROMPT.md) — bei Widersprüchen
gilt `PROMPT.md`. Diese Datei fasst zusammen, wie im Alltag gearbeitet wird, und wird laufend
aktuell gehalten.

## Arbeitsweise

- Strikt phasenweise entlang des Plans in `PROMPT.md` Abschnitt 9. Nach jeder Phase:
  `pnpm build`, `pnpm test`, `pnpm lint` müssen grün sein → Conventional-Commit → kurze
  Zusammenfassung → **stoppen und auf Freigabe warten**.
- Keine `TODO`-Kommentare, keine `any`-Typen, kein auskommentierter Code, keine
  Platzhalter-Komponenten im Endstand einer Phase.
- Keine hartkodierten Beispieldaten im Anwendungscode — Testdaten ausschließlich in
  `prisma/seed.ts`.
- Offene Designentscheidungen selbst treffen und in [`docs/decisions.md`](./docs/decisions.md)
  dokumentieren, nicht nachfragen.

## Stack

| Bereich          | Wahl                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Framework        | Next.js 15, App Router, TypeScript `strict: true`                                            |
| Package Manager  | pnpm                                                                                         |
| Datenbank        | PostgreSQL 16 (`docker-compose.yml`), Prisma ORM                                             |
| Auth             | Auth.js v5, Credentials Provider, JWT-Session (8 h, 60 min Idle-Timeout)                     |
| Passwort-Hashing | argon2id (`@node-rs/argon2`)                                                                 |
| UI               | Tailwind CSS v4 + shadcn/ui (manuell konfiguriert, siehe `docs/decisions.md`) + lucide-react |
| Formulare        | react-hook-form + Zod                                                                        |
| Mutationen       | Server Actions mit serverseitiger Zod-Validierung                                            |
| Externe API      | Route Handlers unter `/api/v1/*` (SSE, Push, Export, Cron-Tick)                              |
| Live-Updates     | SSE (`/api/v1/stream`), Fallback Polling alle 30 s                                           |
| Charts           | Recharts                                                                                     |
| PWA              | `next-pwa` (Workbox)                                                                         |
| Push             | Web Push (VAPID)                                                                             |
| Tests            | Vitest (Unit/Domain), Playwright (E2E)                                                       |
| Zeit             | `date-fns` + `date-fns-tz`; DB **ausschließlich UTC**, Anzeige `Europe/Berlin`               |
| Logging          | `pino`, keine personenbezogenen Daten außer User-ID                                          |

Kein Redis, kein separates Backend, kein Monorepo — eine Next.js-App.

## Befehle

```bash
docker compose up -d      # PostgreSQL 16 lokal starten
pnpm install               # Dependencies installieren
pnpm dev                   # Dev-Server (Turbopack)
pnpm build                 # Produktions-Build
pnpm start                 # Produktions-Server
pnpm lint                  # ESLint
pnpm typecheck              # tsc --noEmit
pnpm format                # Prettier schreibt
pnpm format:check          # Prettier prüft nur
pnpm test                  # Vitest (Unit/Domain), grün auch bei 0 Tests
pnpm test:watch            # Vitest im Watch-Modus
pnpm test:e2e              # Playwright E2E-Tests
```

Ab Phase 1 zusätzlich (Prisma):

```bash
pnpm db:push    # Schema ohne Migration anwenden (Entwicklung)
pnpm db:seed    # prisma/seed.ts ausführen
```

## Ordnerstruktur

```
src/
  app/                 # Next.js App Router: Seiten & Route Handler (/api/v1/*)
  domain/              # Reine Domänenfunktionen (z. B. deriveStatus, stats) — keine I/O
  lib/                 # Querschnitt: authz.ts, db-Client, Zeit-Helper, Logger, Mailer-Interface
  components/          # UI-Komponenten
    ui/                # shadcn/ui-Basiskomponenten
prisma/
  schema.prisma
  seed.ts              # einzige Quelle für Testdaten
docs/
  decisions.md         # Designentscheidungen, ein Absatz pro Entscheidung
  datenschutz.md        # ab Phase 7
e2e/                   # Playwright-Tests
```

## Domänenregeln (verbindlich, siehe PROMPT.md Abschnitt 3)

1. **Status wird abgeleitet, nie gespeichert.** `deriveStatus(activeAbsence, now)` in
   `src/domain/status.ts` ist die einzige Wahrheit (Frontend, API, Statistik nutzen dieselbe
   Funktion):
   - `ABWESEND`: aktive Absence (`status = ACTIVE`) und `plannedReturnAt >= now()`
   - `UEBERFAELLIG`: aktive Absence und `plannedReturnAt < now()`
   - `ANWESEND`: sonst
2. **Maximal eine aktive Abwesenheit pro Schüler** — erzwungen per partiellem Unique-Index
   (`one_active_absence` auf `absences(user_id) WHERE status = 'ACTIVE'`) **und** in der Server
   Action geprüft.
3. **Auschecken:** `checkedOutAt` serverseitig, Client-Zeit wird ignoriert. `plannedReturnAt` muss
   in der Zukunft liegen, max. 14 Tage voraus.
4. **Einchecken:** `checkedInAt` serverseitig, nur bei existierender aktiver Abwesenheit (sonst 409,
   keine Exception im UI).
5. **Verlängerung** erzeugt einen `Extension`-Datensatz; neue Zeit muss nach der alten liegen.
   Genehmigungspflicht über Setting `requireExtensionApproval` (Default `false`).
6. **Mitarbeiter-Korrekturen** erzeugen zwingend einen Audit-Log-Eintrag mit Vorher-/Nachher-Werten.
7. **Dauer wird immer berechnet**, nie gespeichert (`checkedInAt ?? now()` minus `checkedOutAt`).
8. **Sichtbarkeit:** Schüler sehen ausschließlich eigene Daten — kein Endpunkt, keine Server
   Action, keine Seite liefert ihnen fremde Daten, auch nicht aggregiert.

## Rechte

Zentrale `requireRole()` / `can()`-Helper in `src/lib/authz.ts`. **Jede** Server Action und jeder
Route Handler ruft sie als erste Zeile auf — Middleware allein reicht nicht. Rechte-Matrix: siehe
`PROMPT.md` Abschnitt 5.

## Konventionen

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, …), eine Phase = ein oder
  mehrere Commits, Abschluss der Phase immer mit grünem Build/Test/Lint.
- TypeScript `strict`, kein `any`. Zod-Schemas für jede Server-Action-Eingabe.
- Feste Enums im Code (Rolle, Abwesenheitsgrund, Absence-/Extension-Status) statt Freitext.
- Alle Zeiten serverseitig in UTC erzeugen/speichern, Anzeige immer in `Europe/Berlin` über
  `date-fns-tz`.
- Keine personenbezogenen Daten in Logs außer User-ID.
