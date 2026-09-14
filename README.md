# CheckIn — Internats-Ausgangsverwaltung

Digitale Ablösung der handschriftlichen Ausgangsliste eines Internats: Schüler checken beim
Verlassen des Geländes am Handy aus und beim Zurückkommen ein; Mitarbeiter und Admins behalten
Übersicht in Echtzeit.

Der vollständige Projektauftrag steht in [`PROMPT.md`](./PROMPT.md), die Arbeitsregeln, der Stack
und die Domänenlogik in [`CLAUDE.md`](./CLAUDE.md).

> **Stand:** Phase 6 (PWA & Benachrichtigungen) — CheckIn ist als PWA installierbar (Manifest,
> Service Worker, Offline-Fallback, Install-Hinweis inkl. iOS-Anleitung), In-App-Benachrichtigungen
> mit Glocke+Badge existieren für alle drei Rollen (`/benachrichtigungen`,
> `/staff/benachrichtigungen`, `/admin/benachrichtigungen`), dazu optionales Web Push (VAPID) und
> ein idempotenter Cron-Tick (`/api/v1/cron/tick`) für Erinnerungen, Überfälligkeits-Meldungen und
> die Mitarbeiter-Sammelmeldung — Einrichtung siehe [Cron-Tick](#cron-tick-erinnerungen--sammelmeldung)
> unten. Statistiken (Phase 5) unter `/admin/statistiken`/`/staff/statistiken`. Admin (`/admin`) ist
> seit Phase 4 vollständig: Live-Übersicht mit 6 KPI-Karten und Echtzeit-Tabelle (SSE), Filter/
> Sortierung, Benutzerverwaltung (`/admin/schueler`, `/admin/mitarbeiter`), Wohnbereiche,
> Einstellungen, Audit-Log. Phase 7 (Datenschutz & Härtung) folgt gemäß Phasenplan in `PROMPT.md`.

## Voraussetzungen

- Node.js 22+
- pnpm
- Docker (für PostgreSQL)

## Setup

```bash
docker compose up -d
pnpm install
cp .env.example .env.local   # AUTH_SECRET generieren: pnpm dlx auth secret
pnpm exec web-push generate-vapid-keys   # NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
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

## Cron-Tick (Erinnerungen & Sammelmeldung)

`/api/v1/cron/tick` erzeugt Erinnerungen (`reminderMinutesBefore` vor der geplanten Rückkehr),
Überfälligkeits-Meldungen und die Mitarbeiter-Sammelmeldung ("3 Schüler sind aktuell überfällig.").
Der Endpunkt ist idempotent — mehrfaches Aufrufen für denselben Anlass erzeugt keine Duplikate —
und daher sicher alle 5 Minuten aufrufbar. Er erwartet den in `CRON_SECRET` konfigurierten Wert im
Header `x-cron-secret`:

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/v1/cron/tick
```

**Vercel Cron** (`vercel.json` im Projekt-Root):

```json
{
  "crons": [{ "path": "/api/v1/cron/tick", "schedule": "*/5 * * * *" }]
}
```

Vercel Cron sendet automatisch einen `Authorization: Bearer $CRON_SECRET`-Header an vom Dashboard
verwaltete Cron-Jobs; da dieser Endpunkt stattdessen `x-cron-secret` prüft, entweder den Header in
`isAuthorized()` (`src/app/api/v1/cron/tick/route.ts`) ergänzen oder — einfacher für einen
selbstgehosteten Betrieb — einen externen Scheduler mit freier Header-Wahl nutzen (z. B. den
systemd-Timer unten).

**systemd-Timer** (selbstgehostet, z. B. Docker-Compose-Betrieb aus diesem Repo):

`/etc/systemd/system/checkin-cron.service`:

```ini
[Unit]
Description=CheckIn Cron-Tick

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -fsS -H "x-cron-secret=%E{CRON_SECRET}" http://localhost:3000/api/v1/cron/tick
EnvironmentFile=/etc/checkin/cron.env
```

`/etc/systemd/system/checkin-cron.timer`:

```ini
[Unit]
Description=CheckIn Cron-Tick alle 5 Minuten

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

`/etc/checkin/cron.env` enthält `CRON_SECRET=<derselbe Wert wie in .env.local>`. Aktivieren mit
`systemctl enable --now checkin-cron.timer`.

## Weiterführende Dokumente

- [`docs/decisions.md`](./docs/decisions.md) — Designentscheidungen, die der Auftrag offenlässt.
