# CheckIn — Internats-Ausgangsverwaltung

Digitale Ablösung der handschriftlichen Ausgangsliste eines Internats: Schüler checken beim
Verlassen des Geländes am Handy aus und beim Zurückkommen ein; Mitarbeiter und Admins behalten
Übersicht in Echtzeit.

Der vollständige Projektauftrag steht in [`PROMPT.md`](./PROMPT.md), die Arbeitsregeln, der Stack
und die Domänenlogik in [`CLAUDE.md`](./CLAUDE.md).

> **Stand:** Phase 7 (Datenschutz & Härtung) — eigene Daten als JSON/CSV exportierbar
> (`/api/v1/export/eigene-daten`, Link auf `/profil` bzw. den Benachrichtigungsseiten), Löschkonzept
> aus Soft-Delete (Benutzer) und automatischem Hard-Delete alter Abwesenheiten
> (`/api/v1/cron/cleanup`, Frist über das Setting „Aufbewahrungsfrist" einstellbar), Security-Header
> (CSP, HSTS, X-Frame-Options u. a., siehe `next.config.ts`), vollständiges Audit-Log für
> sicherheits-/verwaltungsrelevante Aktionen und `docs/datenschutz.md` mit einem
> Verarbeitungsverzeichnis-Entwurf. Eine rollenübergreifende E2E-Testmatrix
> (`e2e/rbac-matrix.spec.ts`) verifiziert die Rechte-Matrix für jede Seite und jede Rolle. Davor:
> PWA & Benachrichtigungen (Phase 6, Manifest/Service Worker/Offline-Fallback, Web Push, Cron-Tick
> für Erinnerungen — siehe [Cron-Tick](#cron-tick-erinnerungen--sammelmeldung) unten), Statistiken
> (Phase 5) sowie ein seit Phase 4 vollständiger Admin-Bereich (Live-Übersicht, Benutzerverwaltung,
> Wohnbereiche, Einstellungen, Audit-Log). Phase 8 (Abschluss) folgt gemäß Phasenplan in
> `PROMPT.md`.

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

## Cron-Cleanup (Aufbewahrungsfrist)

`/api/v1/cron/cleanup` löscht abgeschlossene/stornierte Abwesenheiten endgültig, sobald sie älter
als das Setting „Aufbewahrungsfrist" (`/admin/einstellungen`, Default 12 Monate) sind — aktive
Abwesenheiten werden nie gelöscht. Ebenfalls per `x-cron-secret`-Header geschützt und idempotent
(mehrfaches Aufrufen am selben Tag löscht nur die zu diesem Zeitpunkt tatsächlich fälligen
Datensätze). Anders als der Cron-Tick reicht hier ein täglicher Rhythmus:

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/v1/cron/cleanup
```

Für Vercel Cron einen weiteren Eintrag in `vercel.json` ergänzen
(`{ "path": "/api/v1/cron/cleanup", "schedule": "0 3 * * *" }`, täglich um 3 Uhr) bzw. für den
systemd-Timer oben eine zweite Service-/Timer-Datei mit `OnCalendar=03:00` und dem entsprechenden
Endpunkt anlegen.

## Weiterführende Dokumente

- [`docs/decisions.md`](./docs/decisions.md) — Designentscheidungen, die der Auftrag offenlässt.
- [`docs/datenschutz.md`](./docs/datenschutz.md) — Verarbeitungsverzeichnis-Entwurf (Phase 7).
