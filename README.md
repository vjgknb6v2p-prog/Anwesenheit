# CheckIn — Internats-Ausgangsverwaltung

Digitale Ablösung der handschriftlichen Ausgangsliste eines Internats: Schüler checken beim
Verlassen des Geländes am Handy aus und beim Zurückkommen ein; Mitarbeiter und Admins behalten
Übersicht in Echtzeit.

Der vollständige Projektauftrag steht in [`PROMPT.md`](./PROMPT.md), die Arbeitsregeln, der Stack
und die Domänenlogik in [`CLAUDE.md`](./CLAUDE.md).

> **Stand:** Phase 8 (Abschluss) — Projekt vollständig gemäß Phasenplan in `PROMPT.md` Abschnitt 9
> umgesetzt. README mit Setup-, Seed-, Deploy- und Cron-Anleitung (siehe [Deploy](#deploy) unten),
> `docs/decisions.md` mit allen Designentscheidungen und einer Lasttest-Notiz
> ([`docs/lasttest.md`](./docs/lasttest.md), ausführbar mit `pnpm test:load`). Davor: Datenschutz &
> Härtung (Phase 7 — eigene Daten als JSON/CSV exportierbar unter `/api/v1/export/eigene-daten`,
> Löschkonzept aus Soft-Delete und automatischem Hard-Delete alter Abwesenheiten über
> `/api/v1/cron/cleanup`, Security-Header über `next.config.ts`, vollständiges Audit-Log,
> `docs/datenschutz.md` sowie eine rollenübergreifende E2E-Testmatrix in
> `e2e/rbac-matrix.spec.ts`), PWA & Benachrichtigungen (Phase 6, Manifest/Service Worker/
> Offline-Fallback, Web Push, Cron-Tick für Erinnerungen — siehe
> [Cron-Tick](#cron-tick-erinnerungen--sammelmeldung) unten), Statistiken (Phase 5) sowie ein seit
> Phase 4 vollständiger Admin-Bereich (Live-Übersicht, Benutzerverwaltung, Wohnbereiche,
> Einstellungen, Audit-Log).

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
| `pnpm test:load`                    | Lasttest (siehe `docs/lasttest.md`)   |

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

## Deploy

Die App ist ein einzelner Next.js-Prozess ohne Redis/separates Backend — es wird nur eine
erreichbare PostgreSQL-16-Instanz benötigt. Zwei Betriebsarten:

### Vercel

1. Repository importieren, alle Variablen aus `.env.example` in den Projekt-Einstellungen setzen
   (insbesondere `DATABASE_URL` einer erreichbaren Postgres-Instanz, z. B. Vercel Postgres/Neon/
   Supabase — `docker-compose.yml` ist nur für die lokale Entwicklung gedacht).
2. Vor dem ersten Deploy einmalig `pnpm db:push && pnpm db:seed` gegen die Ziel-Datenbank ausführen
   (lokal mit der Produktions-`DATABASE_URL` in der Umgebung, oder als einmaliger CI-Schritt) —
   `pnpm build` führt bewusst **keine** Migration aus, damit ein fehlgeschlagener Build niemals ein
   Schema halb migriert zurücklässt.
3. `vercel.json` mit den Cron-Einträgen aus den Abschnitten [Cron-Tick](#cron-tick-erinnerungen--sammelmeldung)
   und [Cron-Cleanup](#cron-cleanup-aufbewahrungsfrist) anlegen (Vercel Cron ruft `GET`-Routen nach
   Zeitplan auf).
4. Deploy auslösen (Push auf den verknüpften Branch bzw. `vercel deploy --prod`). Vercel führt
   `pnpm build` automatisch aus.

### Selbstgehostet (z. B. eigener Server/VM mit Docker Compose)

```bash
docker compose up -d          # PostgreSQL 16
pnpm install --prod=false     # Build braucht Dev-Dependencies (TypeScript, Tailwind, …)
pnpm db:push                  # bestehende Migrationen anwenden
pnpm db:seed                  # nur beim allerersten Deploy / für Demo-Daten
pnpm build
pnpm start                    # Next.js-Produktionsserver, Standardport 3000
```

Für den Dauerbetrieb `pnpm start` unter einem Prozess-Supervisor laufen lassen (z. B. systemd-
Service analog zu den Timer-Beispielen unten, oder `pm2 start pnpm -- start`) und dahinter einen
Reverse Proxy mit TLS (nginx/Caddy) betreiben — die in `next.config.ts` gesetzte
`Strict-Transport-Security`-Header wirkt nur über HTTPS. Bei Schema-Änderungen in künftigen Releases
vor jedem Neustart erneut `pnpm db:push` ausführen (nicht `pnpm db:seed`, das würde erneut
Demo-Daten anlegen). Die beiden Cron-Endpunkte laufen selbstgehostet über systemd-Timer, siehe unten.

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
- [`docs/lasttest.md`](./docs/lasttest.md) — Lasttest-Notiz (Phase 8): Methodik, Ergebnisse,
  Einordnung. Ausführbar mit `pnpm test:load` (`scripts/lasttest.ts`).
