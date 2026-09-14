# CheckIn — Internats-Ausgangsverwaltung

Digitale Ablösung der handschriftlichen Ausgangsliste eines Internats: Schüler checken beim
Verlassen des Geländes am Handy aus und beim Zurückkommen ein; Mitarbeiter und Admins behalten
Übersicht in Echtzeit.

Der vollständige Projektauftrag steht in [`PROMPT.md`](./PROMPT.md), die Arbeitsregeln, der Stack
und die Domänenlogik in [`CLAUDE.md`](./CLAUDE.md).

> **Stand:** Phase 2 (Schüler-Flow) — Login/Logout, Passwort-vergessen, vollständiges
> Schüler-Dashboard (Aus-/Einchecken, Verlängern, Live-Countdown), eigene Historie, Profil,
> Bottom-Navigation. Mitarbeiter-/Admin-Bereiche (`/staff`, `/admin`) haben weiterhin nur
> minimalen Inhalt — sie folgen in Phase 3/4 gemäß Phasenplan in `PROMPT.md`.

## Voraussetzungen

- Node.js 22+
- pnpm
- Docker (für PostgreSQL)

## Setup

```bash
docker compose up -d
pnpm install
cp .env.example .env.local   # AUTH_SECRET generieren: pnpm dlx auth secret
pnpm db:push
pnpm db:seed
pnpm dev
```

Die App läuft danach unter <http://localhost:3000>.

### Demo-Zugangsdaten (aus `prisma/seed.ts`)

| Rolle       | E-Mail                                                                                                       | Passwort        |
| ----------- | ------------------------------------------------------------------------------------------------------------ | --------------- |
| Admin       | `admin@internat.de`                                                                                          | `Admin!2026`    |
| Mitarbeiter | `k.weber@internat.de`, `m.schulz@internat.de`                                                                | `Staff!2026`    |
| Schüler     | `lena.b@internat.de`, `jonas.k@internat.de`, `mia.h@internat.de`, `finn.r@internat.de`, `sara.l@internat.de` | `Schueler!2026` |

## Befehle

| Befehl                              | Zweck                                 |
| ----------------------------------- | ------------------------------------- |
| `pnpm dev`                          | Entwicklungsserver                    |
| `pnpm build`                        | Produktions-Build                     |
| `pnpm start`                        | Produktionsserver (nach `pnpm build`) |
| `pnpm lint`                         | ESLint                                |
| `pnpm typecheck`                    | `tsc --noEmit`                        |
| `pnpm format` / `pnpm format:check` | Prettier                              |
| `pnpm test`                         | Vitest (Unit-/Domänentests)           |
| `pnpm test:e2e`                     | Playwright (E2E)                      |

Zusätzlich (ab Phase 1, Prisma):

| Befehl             | Zweck                                                     |
| ------------------ | --------------------------------------------------------- |
| `pnpm db:generate` | Prisma Client generieren                                  |
| `pnpm db:migrate`  | Neue Migration erstellen (Entwicklung)                    |
| `pnpm db:push`     | Bestehende Migrationen anwenden (`prisma migrate deploy`) |
| `pnpm db:seed`     | `prisma/seed.ts` ausführen                                |

## Umgebungsvariablen

Siehe [`.env.example`](./.env.example) für alle Variablen und Kommentare, ab welcher Phase sie
benötigt werden (Datenbank, Auth.js, Web-Push/VAPID, SMTP, Cron-Secret). `AUTH_SECRET` sollte
lokal per `pnpm dlx auth secret` erzeugt werden.

## Weiterführende Dokumente

- [`docs/decisions.md`](./docs/decisions.md) — Designentscheidungen, die der Auftrag offenlässt.
