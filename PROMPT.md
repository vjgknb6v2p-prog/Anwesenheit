# Projektauftrag: Internats-Ausgangsverwaltung ("CheckIn")

> Diesen Text als `PROMPT.md` ins leere Projektverzeichnis legen und Claude Code starten mit:
> `Lies PROMPT.md vollständig. Erstelle zuerst CLAUDE.md und den Phasenplan als TODO-Liste. Beginne dann mit Phase 0. Stoppe nach jeder Phase.`

---

## 0. Arbeitsweise (bindend)

- Arbeite **strikt in den Phasen aus Abschnitt 9**. Nach jeder Phase: `pnpm build`, `pnpm test`, `pnpm lint` müssen grün sein → Git-Commit mit Conventional-Commit-Message → kurze Zusammenfassung → **stoppen und auf Freigabe warten**.
- Keine `TODO`-Kommentare, keine `any`-Typen, keine auskommentierten Code-Leichen, keine Platzhalter-Komponenten im Endstand einer Phase.
- Keine Hardcoded-Beispieldaten im Anwendungscode. Testdaten ausschließlich in `prisma/seed.ts`.
- Vor größeren Refactorings: kurz Plan nennen, nicht einfach loslegen.
- Bei jeder Designentscheidung, die hier nicht geregelt ist: entscheide selbst, dokumentiere die Entscheidung in `docs/decisions.md` (ein Absatz), frage **nicht** nach.
- Schreibe `CLAUDE.md` mit: Stack, Befehle, Ordnerstruktur, Domänenregeln (Abschnitt 3), Konventionen. Halte sie aktuell.

---

## 1. Kontext

Internat mit ca. 150 Schülern. Bisher tragen sich Schüler beim Verlassen des Geländes handschriftlich in eine Liste ein und beim Zurückkommen wieder aus. Das wird durch diese Web-App ersetzt. Kritischer Alltagsfall: Schüler öffnet die App am Handy an der Pforte und ist in **maximal 3 Taps** ausgecheckt bzw. in **1 Tap** eingecheckt.

Primärgerät ist das Smartphone (iOS + Android). Mitarbeiter nutzen Tablet, Admins Desktop.

---

## 2. Tech-Stack (fest vorgegeben, nicht abweichen)

| Bereich | Wahl |
|---|---|
| Framework | Next.js 15, App Router, TypeScript `strict: true` |
| Package Manager | pnpm |
| Datenbank | PostgreSQL 16 via `docker-compose.yml` (lokal), Prisma ORM |
| Auth | Auth.js v5 (NextAuth), Credentials Provider, JWT-Session, 8 h Laufzeit, 60 min Idle-Timeout |
| Passwort-Hashing | argon2id (`@node-rs/argon2`) |
| UI | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Formulare | react-hook-form + Zod (`zodResolver`) |
| Mutationen | Server Actions mit Zod-Validierung serverseitig |
| Externe API | Route Handlers unter `/api/v1/*` (nur wo wirklich nötig: SSE, Push, Export) |
| Live-Updates | Server-Sent Events (`/api/v1/stream`), Fallback: `revalidate`-Polling alle 30 s |
| Charts | Recharts |
| PWA | `next-pwa` (Workbox), Manifest, Maskable Icons, Offline-Fallback-Seite |
| Push | Web Push (VAPID, `web-push`), Graceful Degradation |
| Tests | Vitest (Unit/Domain), Playwright (E2E) |
| Zeit | `date-fns` + `date-fns-tz`. **DB speichert ausschließlich UTC**, Anzeige in `Europe/Berlin` |
| Logging | `pino`, strukturiert, keine personenbezogenen Daten in Logs außer User-ID |

Kein Redis, kein separates Backend, kein Monorepo. Eine Next.js-App.

---

## 3. Domänenregeln (eindeutig, keine Interpretationsspielräume)

1. **Status wird nicht gespeichert, sondern abgeleitet.** Es gibt keine Spalte `user.status`.
   - `ABWESEND` wenn eine Absence mit `status = ACTIVE` existiert und `plannedReturnAt >= now()`
   - `UEBERFAELLIG` wenn eine Absence mit `status = ACTIVE` existiert und `plannedReturnAt < now()`
   - `ANWESEND` sonst
   Implementiere das als **eine** reine Funktion `deriveStatus(activeAbsence, now)` in `src/domain/status.ts`. Sie ist die einzige Wahrheit — Frontend, API, Statistik nutzen dieselbe Funktion.
2. **Maximal eine aktive Abwesenheit pro Schüler.** Erzwinge das per partiellem Unique-Index in Postgres:
   `CREATE UNIQUE INDEX one_active_absence ON absences (user_id) WHERE status = 'ACTIVE';`
   Zusätzlich Prüfung in der Server Action, Fehler sauber abfangen.
3. **Auschecken:** `checkedOutAt = now()` serverseitig gesetzt (Client-Zeit wird ignoriert). `plannedReturnAt` muss in der Zukunft liegen, max. 14 Tage voraus.
4. **Einchecken:** `checkedInAt = now()` serverseitig, `status = COMPLETED`. Nur möglich, wenn eine aktive Abwesenheit existiert (sonst 409, keine Exception im UI).
5. **Verlängerung:** erzeugt einen `Extension`-Datensatz und setzt `absence.plannedReturnAt` neu. Neue Zeit muss nach der alten liegen. Genehmigungspflicht ist ein Setting (`requireExtensionApproval`, Default `false`); bei `true` gilt die Verlängerung erst nach Freigabe durch Mitarbeiter, bis dahin bleibt die alte Rückkehrzeit maßgeblich für die Überfälligkeit.
6. **Korrektur durch Mitarbeiter:** darf `checkedOutAt`, `plannedReturnAt`, `checkedInAt` ändern und Abwesenheiten stornieren (`CANCELLED`). Jede Korrektur erzeugt zwingend einen Audit-Log-Eintrag mit Vorher-/Nachher-Werten.
7. **Dauer** wird immer berechnet (`checkedInAt ?? now()` minus `checkedOutAt`), nie gespeichert.
8. **Sichtbarkeit:** Ein Schüler sieht ausschließlich eigene Daten. Kein Endpunkt, keine Server Action, keine Seite gibt ihm Daten anderer Schüler zurück — auch nicht aggregiert, auch nicht als Anzahl.

---

## 4. Datenmodell

Setze exakt dieses Prisma-Schema um (Felder ergänzen ist erlaubt, entfernen nicht):

```prisma
enum Role { STUDENT STAFF ADMIN }
enum AbsenceStatus { ACTIVE COMPLETED CANCELLED }
enum ExtensionStatus { PENDING APPROVED REJECTED AUTO_APPROVED }

model User {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  email           String   @unique
  passwordHash    String
  role            Role     @default(STUDENT)
  schoolClass     String?          // z. B. "10b"
  room            String?          // z. B. "B-214"
  residentialArea ResidentialArea? @relation(fields: [residentialAreaId], references: [id])
  residentialAreaId String?
  avatarUrl       String?
  active          Boolean  @default(true)
  mustChangePassword Boolean @default(false)
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?        // Soft Delete

  absences        Absence[]
  notifications   Notification[]
  pushSubscriptions PushSubscription[]
}

model ResidentialArea {
  id    String @id @default(cuid())
  name  String @unique            // z. B. "Haus Nord"
  users User[]
}

model Absence {
  id              String        @id @default(cuid())
  user            User          @relation(fields: [userId], references: [id])
  userId          String
  checkedOutAt    DateTime
  plannedReturnAt DateTime
  checkedInAt     DateTime?
  reason          String                       // aus fester Liste, siehe unten
  reasonDetail    String?
  destination     String
  note            String?
  status          AbsenceStatus @default(ACTIVE)
  checkedInById   String?                      // falls Mitarbeiter eingecheckt hat
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  extensions      Extension[]

  @@index([userId, status])
  @@index([status, plannedReturnAt])
}

model Extension {
  id             String          @id @default(cuid())
  absence        Absence         @relation(fields: [absenceId], references: [id], onDelete: Cascade)
  absenceId      String
  oldReturnAt    DateTime
  newReturnAt    DateTime
  reason         String?
  status         ExtensionStatus @default(AUTO_APPROVED)
  approvedById   String?
  decidedAt      DateTime?
  createdAt      DateTime        @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  type      String                  // RETURN_SOON | OVERDUE | EXTENSION_DECIDED | STAFF_OVERDUE_DIGEST
  title     String
  message   String
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt])
}

model PushSubscription {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
}

model AuditLog {
  id           String   @id @default(cuid())
  actorId      String?                 // null = System
  action       String                  // CHECK_OUT, CHECK_IN, EXTEND, CORRECT_ABSENCE, USER_CREATE, ...
  targetUserId String?
  targetType   String?
  targetId     String?
  metadata     Json?                   // Vorher/Nachher bei Korrekturen
  ip           String?
  createdAt    DateTime @default(now())

  @@index([createdAt])
  @@index([targetUserId])
}

model Setting {
  key   String @id
  value Json
}
```

**Feste Abwesenheitsgründe** (Enum im Code, nicht Freitext): `HEIMFAHRT`, `ARZT`, `SPORT_VEREIN`, `EINKAUF_STADT`, `FAMILIE_BESUCH`, `SCHULVERANSTALTUNG`, `SONSTIGES` (nur bei `SONSTIGES` ist `reasonDetail` Pflicht).

**Settings mit Defaults:** `requireExtensionApproval=false`, `reminderMinutesBefore=30`, `overdueGraceMinutes=10`, `maxPlannedDurationHours=72`, `curfewTime="22:00"`.

---

## 5. Rechte-Matrix (als Test abbilden)

| Aktion | Schüler | Mitarbeiter | Admin |
|---|:--:|:--:|:--:|
| Eigenen Status sehen | ✅ | ✅ | ✅ |
| Selbst aus-/einchecken | ✅ | ✅ | ✅ |
| Eigene Historie | ✅ | ✅ | ✅ |
| Eigene Daten exportieren (JSON/CSV) | ✅ | ✅ | ✅ |
| Liste aller Anwesenden/Abwesenden | ❌ | ✅ | ✅ |
| Fremde Historie einsehen | ❌ | ✅ | ✅ |
| Abwesenheit korrigieren/stornieren | ❌ | ✅ | ✅ |
| Verlängerung genehmigen | ❌ | ✅ | ✅ |
| Für Schüler einchecken | ❌ | ✅ | ✅ |
| Benutzer anlegen/bearbeiten/deaktivieren | ❌ | ❌ | ✅ |
| Rollen ändern, Passwort zurücksetzen | ❌ | ❌ | ✅ |
| Statistiken | ❌ | nur eigener Wohnbereich | ✅ |
| Audit-Log | ❌ | ❌ | ✅ |
| Einstellungen, Wohnbereiche | ❌ | ❌ | ✅ |

Umsetzung: zentrale `requireRole()` / `can()`-Helper in `src/lib/authz.ts`. **Jede** Server Action und jeder Route Handler ruft sie als erste Zeile auf. Middleware allein reicht nicht.

---

## 6. Seiten & Navigation

**Schüler** (Bottom-Tab-Navigation, 4 Einträge): `/` Dashboard · `/abwesenheiten` Historie · `/benachrichtigungen` · `/profil`

**Mitarbeiter:** `/staff` Dashboard · `/staff/abwesend` · `/staff/ueberfaellig` · `/staff/schueler` · `/staff/schueler/[id]` · `/staff/historie`

**Admin:** `/admin` Live-Übersicht · `/admin/schueler` · `/admin/mitarbeiter` · `/admin/abwesenheiten` · `/admin/statistiken` · `/admin/benachrichtigungen` · `/admin/audit` · `/admin/einstellungen` · `/admin/wohnbereiche`

Root-Route `/` leitet rollenabhängig weiter. Öffentlich nur `/login`, `/passwort-vergessen`, `/passwort-zuruecksetzen/[token]`.

---

## 7. UI-Anforderungen

**Schüler-Dashboard** ist eine einzige Screenful ohne Scrollen auf einem iPhone SE:
- Kopfzeile: Avatar, Vorname, Statusbadge (grün ANWESEND / rot ABWESEND / orange ÜBERFÄLLIG)
- Bei ANWESEND: ein Primärbutton `AUSCHECKEN`, mindestens 64 px hoch, volle Breite. Tap öffnet ein Bottom-Sheet-Formular: Grund (Chips, einzeln antippbar), Ziel (Freitext mit Vorschlagsliste aus eigener Historie), geplante Rückkehr (Quick-Chips „+2 h", „+4 h", „Heute 21:30", „Sonntag 18:00" + Custom-Picker), optionale Bemerkung. Ein Bestätigungstap.
- Bei ABWESEND/ÜBERFÄLLIG: Karte mit Ziel, Auscheckzeit, „Geplante Rückkehr: 21:30 Uhr", Live-Countdown. Primärbutton `EINCHECKEN` (ein Tap, keine Rückfrage, danach Toast „Du bist erfolgreich eingecheckt."). Sekundärbutton `ABWESENHEIT VERLÄNGERN`.
- Bei ÜBERFÄLLIG zusätzlich rote Hinweiszeile: „Deine geplante Rückkehrzeit ist überschritten."

**Admin-Live-Übersicht:**
- 6 KPI-Karten: Schüler gesamt, Anwesend, Abwesend, Überfällig, Aktive Abwesenheiten, Abwesenheiten heute
- Tabelle: Schüler · Status · Auscheckzeit · Rückkehr geplant · Dauer · Aktion. Sortierbar nach jeder Spalte, Filter: Status, Wohnbereich, Klasse, Volltextsuche. Überfällige Zeilen orange hinterlegt und standardmäßig oben.
- Aktualisierung über SSE ohne Reload. Beim Ein-/Auschecken eines Schülers ändern sich KPIs und Tabelle innerhalb von 2 Sekunden.
- Auf < 768 px wird die Tabelle zu Karten (keine horizontal scrollende Tabelle).

**Allgemein:** Systemschrift-Stack, abgerundete Karten (`rounded-2xl`), dezente Schatten, Dark Mode über `prefers-color-scheme` + manueller Toggle, Farben als semantische CSS-Variablen (`--status-present/absent/overdue/info`), alle interaktiven Elemente ≥ 44 px, `env(safe-area-inset-bottom)` für die Bottom-Nav, Fokus-Ringe sichtbar, WCAG AA Kontrast.

---

## 8. Benachrichtigungen (realistisch umsetzen)

- **In-App-Benachrichtigungen** sind die Basis und müssen immer funktionieren (Glocke mit Badge, `/benachrichtigungen`).
- **Web Push** zusätzlich, über VAPID. Auf iOS funktioniert Push **nur**, wenn die PWA zum Home-Bildschirm hinzugefügt wurde (iOS 16.4+). Baue dafür einen Hinweis-Banner mit Anleitung ein, statt Push als selbstverständlich anzunehmen. Kein Fehler, wenn Push nicht verfügbar ist.
- **Auslösung ohne externen Cron:** ein Route Handler `/api/v1/cron/tick` (geschützt per `CRON_SECRET`-Header), der Erinnerungen (`reminderMinutesBefore`), Überfälligkeits-Meldungen und die Mitarbeiter-Sammelmeldung („3 Schüler sind aktuell überfällig.") erzeugt. Idempotent — derselbe Anlass darf nie doppelt benachrichtigen. Dokumentiere in `README.md`, wie man ihn per Vercel Cron bzw. systemd-Timer alle 5 Minuten aufruft.

---

## 9. Phasenplan mit Definition of Done

**Phase 0 – Fundament.** Next.js-Projekt, Tailwind, shadcn/ui, ESLint/Prettier, `docker-compose.yml` mit Postgres, `.env.example`, Vitest + Playwright konfiguriert, `CLAUDE.md`, `README.md`.
*DoD:* `docker compose up -d && pnpm dev` läuft, Startseite rendert, `pnpm test` läuft (auch mit 0 Tests) grün.

**Phase 1 – Datenmodell & Auth.** Prisma-Schema aus Abschnitt 4, Migration, partieller Unique-Index als Raw-SQL-Migration, `prisma/seed.ts`, Auth.js mit argon2id, Login/Logout, Passwort-vergessen (Token in DB, E-Mail-Versand als `ConsoleMailer`-Adapter mit Interface für späteren SMTP), RBAC-Helper, Middleware, Idle-Timeout, Rate-Limiting auf Login (5 Versuche / 15 min pro E-Mail + IP).
*DoD:* Seed erzeugt 5 Schüler, 2 Mitarbeiter, 1 Admin. Login mit jeder Rolle funktioniert. Playwright-Test: Schüler ruft `/admin` auf → Redirect, kein Datenleck. Unit-Tests für `deriveStatus` decken alle drei Zustände + Grenzfall „exakt jetzt" ab.

**Phase 2 – Schüler-Flow (Kernfunktion).** Dashboard, Auschecken, Einchecken, Verlängern, eigene Historie, Profil, Bottom-Navigation, alle Server Actions mit Zod + Audit-Log.
*DoD:* E2E-Test: Login → Auschecken → Dashboard zeigt ABWESEND und korrekte geplante Rückkehr → Verlängern → neue Zeit sichtbar → Einchecken → ANWESEND, Eintrag in Historie mit korrekter Dauer. Zweites Auschecken bei aktiver Abwesenheit schlägt kontrolliert fehl.

**Phase 3 – Mitarbeiteransicht.** Übersicht abwesend/überfällig, Schülerliste + Detailseite, Korrekturen, Fremd-Einchecken, Verlängerungsfreigabe.
*DoD:* E2E-Test: Mitarbeiter korrigiert eine Rückkehrzeit → Audit-Log enthält Vorher/Nachher. Überfällige Schüler erscheinen in der richtigen Liste.

**Phase 4 – Admin & Live-Übersicht.** KPI-Karten, Live-Tabelle mit SSE, Filter/Sortierung, Benutzerverwaltung (anlegen, bearbeiten, deaktivieren, Soft-Delete, Rolle ändern, Passwort zurücksetzen), Wohnbereiche, Einstellungen, Audit-Log-Ansicht mit Filter.
*DoD:* Zwei Browser-Kontexte im Playwright-Test: Schüler checkt aus → Admin-KPI erhöht sich ohne Reload innerhalb von 2 s.

**Phase 5 – Statistiken.** Abwesenheiten pro Tag/Woche/Monat, Ø-Dauer, Anzahl verspäteter Rückkehren, häufigste Gründe, Ausgänge pro Schüler. Zeitraumfilter, CSV-Export.
*DoD:* Aggregationen als testbare Funktionen in `src/domain/stats.ts` mit Unit-Tests gegen fixe Seed-Daten. Diagramme responsiv.

**Phase 6 – PWA & Benachrichtigungen.** Manifest, Service Worker, Offline-Fallback, Install-Prompt, iOS-Hinweis, In-App-Benachrichtigungen, Web Push, Cron-Tick.
*DoD:* Lighthouse PWA-Audit besteht. Installierbar auf Android. Cron-Tick zweimal hintereinander aufgerufen erzeugt keine Duplikate.

**Phase 7 – Datenschutz & Härtung.** Datenexport der eigenen Daten (JSON + CSV), Löschkonzept (Soft-Delete + Hard-Delete-Job für Abwesenheiten älter als konfigurierbare Aufbewahrungsfrist, Default 12 Monate), Security-Header (CSP, HSTS, `X-Frame-Options`), Audit-Log für alle schreibenden Aktionen vollständig, Zielorte nur für Berechtigte sichtbar, `docs/datenschutz.md` mit Verarbeitungsverzeichnis-Entwurf.
*DoD:* Test, der für jede Rolle jeden geschützten Endpunkt durchprobiert und die Matrix aus Abschnitt 5 verifiziert.

**Phase 8 – Abschluss.** README mit Setup-, Seed-, Deploy- und Cron-Anleitung, Demo-Zugangsdaten, `docs/decisions.md`, Lasttest-Notiz, finaler Durchlauf aller Tests.

---

## 10. Seed-Daten

- 1 Admin: `admin@internat.de` / `Admin!2026`
- 2 Mitarbeiter: `k.weber@internat.de`, `m.schulz@internat.de` / `Staff!2026`
- 5 Schüler: `lena.b@internat.de`, `jonas.k@internat.de`, `mia.h@internat.de`, `finn.r@internat.de`, `sara.l@internat.de` / `Schueler!2026`
- 3 Wohnbereiche: Haus Nord, Haus Süd, Altbau
- Ausgangslage: 1 Schüler aktiv abwesend (rechtzeitig), 1 Schüler überfällig, 3 anwesend
- Ca. 60 historische Abwesenheiten über die letzten 90 Tage, plausibel verteilt (mehr am Wochenende), damit Statistik und Diagramme sofort etwas zeigen
- Passwörter gehören ausschließlich in den Seed und ins README, niemals in Anwendungscode

---

## 11. Nicht-Ziele (nicht bauen)

Elternzugang, Schnittstelle zu Schulverwaltungssoftware, QR-/NFC-Scanner an der Pforte, Geofencing/Standortverfolgung, Chat, Notenverwaltung, Mehrsprachigkeit (nur Deutsch), native Apps, Bezahlfunktionen.

---

## 12. Endabnahme

Die Arbeit gilt als fertig, wenn:
1. `docker compose up -d && pnpm install && pnpm db:push && pnpm db:seed && pnpm dev` auf einem frischen Rechner läuft — mehr Schritte darf es nicht brauchen.
2. Alle Playwright-Szenarien aus den Phasen-DoD grün sind.
3. Ein Schüler auf dem Handy in ≤ 3 Taps ausgecheckt und in 1 Tap eingecheckt ist.
4. Die Rechte-Matrix durch automatisierte Tests abgesichert ist.
5. `pnpm build` ohne Warnungen durchläuft und `tsc --noEmit` fehlerfrei ist.
