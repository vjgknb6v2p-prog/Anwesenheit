# Designentscheidungen

Dieses Dokument hält Entscheidungen fest, die `PROMPT.md` bewusst offenlässt. Jede Entscheidung
ein Absatz, chronologisch, neueste zuletzt.

## Phase 0

**Next.js-Scaffold statt Handaufbau.** Das Projekt wurde mit `create-next-app@15` (pinned auf
Next.js 15, nicht `@latest`, da dieses bereits Next.js 16 ausliefert) non-interaktiv erzeugt
(`--typescript --eslint --tailwind --app --src-dir --import-alias "@/*"`) und anschließend in das
bestehende Git-Repository kopiert, um Next.js' eigene, gepflegte Grundkonfiguration
(tsconfig, ESLint-Flat-Config, PostCSS/Tailwind-Setup) zu übernehmen statt sie manuell
nachzubauen.

**shadcn/ui ohne CLI-Init.** Der reguläre `shadcn init`-Fluss ruft `ui.shadcn.com` auf, um die
Registry-Konfiguration zu laden; dieser Host ist im Netzwerk dieser Umgebung blockiert (Policy-
Denial). Stattdessen wurde die shadcn/ui-Grundkonfiguration manuell nachgebildet: `components.json`
(Style „new-york", Basisfarbe „neutral", `cssVariables: true`), `src/lib/utils.ts` mit der
Standard-`cn()`-Hilfsfunktion sowie die zugehörigen npm-Pakete (`class-variance-authority`, `clsx`,
`tailwind-merge`, `lucide-react`, `tw-animate-css`) direkt über die npm-Registry installiert. Die
CSS-Variablen in `src/app/globals.css` entsprechen dem shadcn/ui-„neutral"-Theme für Tailwind v4
(`@theme inline`, `oklch()`-Werte, `.dark`-Klasse + `@custom-variant dark`). Sollte der Host später
erreichbar sein, können einzelne UI-Komponenten regulär per `pnpm dlx shadcn@latest add <name>`
nachinstalliert werden, da `components.json` bereits korrekt konfiguriert ist.

**Systemschrift-Stack statt Google Fonts.** Abschnitt 7 des Auftrags verlangt explizit einen
„Systemschrift-Stack". Das von `create-next-app` generierte Layout lud standardmäßig die
Google-Font „Geist" über `next/font/google` (Netzwerkzugriff beim Build). Das wurde entfernt;
`--font-sans`/`--font-mono` in `globals.css` sind stattdessen native System-Font-Stacks
(`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …` bzw. `ui-monospace, …`). Das vermeidet
zusätzlich eine unnötige externe Netzwerkabhängigkeit beim Produktions-Build.

**Dark Mode: `prefers-color-scheme` + vorbereitete manuelle Override-Klasse.** In Phase 0 wird nur
die CSS-Grundlage gelegt: Light-Werte in `:root`, Dark-Werte automatisch per
`@media (prefers-color-scheme: dark)` (gescoped auf `:root:not(.light)`) sowie identisch unter
`:root.dark` für einen späteren manuellen Toggle. Die eigentliche Toggle-UI-Komponente (Profil-Seite
o. ä.) folgt erst mit den Seiten, die sie benötigen (ab Phase 2), da Phase 0 keine UI-Komponenten
außerhalb der minimalen Startseite vorsieht.

**Vitest „grün bei 0 Tests" über Config-Flag statt Fake-Test.** `vitest.config.ts` setzt
`test.passWithNoTests: true`, damit `pnpm test` ohne vorhandene Testdateien mit Exit-Code 0 endet.
Das vermeidet einen inhaltslosen Platzhalter-Test nur zum Bestehen der Phase-0-DoD.

**Playwright konfiguriert, aber ohne Testfälle in Phase 0.** `playwright.config.ts` ist vorhanden
(Chromium-Projekt, `webServer` startet `pnpm start` gegen Port 3000). Da Abschnitt 0 nur
`pnpm build`, `pnpm test` und `pnpm lint` als Phasen-Gate nennt (nicht `pnpm test:e2e`) und echte
E2E-Testfälle erst mit den entsprechenden Seiten ab Phase 1/2 sinnvoll sind, enthält das
`e2e`-Verzeichnis in Phase 0 bewusst noch keine Tests.

**`.env.example` bereits vollständig für alle Phasen.** Um spätere Phasen nicht zu zwingen, die
Struktur der `.env.example` nachträglich umzubauen, sind alle über den gesamten Auftrag hinweg
benötigten Variablen (DB, Auth.js, Cron-Secret, VAPID, SMTP) schon in Phase 0 als leere/Beispiel-
Platzhalter aufgeführt, mit Kommentaren, in welcher Phase sie erstmals gebraucht werden.

**Next.js Turbopack für `dev` und `build`.** `create-next-app` erzeugt standardmäßig
`next dev --turbopack` und `next build --turbopack`. Da der Auftrag dazu keine Vorgabe macht und
Turbopack in Next.js 15.5 der von Next.js empfohlene, produktionsreife Standardweg ist, wurde das
beibehalten statt auf den klassischen Webpack-Build zurückzuwechseln.

## Phase 1

**Prisma 6.19.3 statt `prisma@latest` (8.0.0-rc.15).** Der `latest`-Dist-Tag der Registry dieser
Umgebung zeigt auf eine Release-Candidate von Prisma 8, die zudem die Schema-Syntax bricht
(`datasource.url` direkt im Schema wird nicht mehr unterstützt, stattdessen `prisma.config.ts` +
Treiber-Adapter nötig). Für ein produktives Projekt wurde stattdessen die letzte reguläre
Vollversion `6.19.3` gepinnt (klassische, im Schema deklarierte `url = env("DATABASE_URL")`,
keine Treiber-Adapter-Pflicht) — funktional identisch zur PROMPT.md-Vorgabe „Prisma ORM", ohne
Beta-Risiko.

**Lokales PostgreSQL (apt-Paket) statt Docker für die Verifikation dieser Session.** Der
Docker-Daemon lässt sich in dieser Remote-Sandbox nicht starten (siehe Phase-0-Entscheidung).
Für Migration/Seed/E2E-Tests wurde stattdessen ein lokal installiertes PostgreSQL 16 mit
identischen Zugangsdaten (`checkin`/`checkin`, Port 5432) wie in `docker-compose.yml` verwendet —
aus Sicht von Prisma/`DATABASE_URL` nicht unterscheidbar. Auf einer normalen Entwicklungsmaschine
mit laufendem Docker funktioniert `docker compose up -d` unverändert.

**`pnpm db:push` führt real `prisma migrate deploy` aus.** PROMPT.md Abschnitt 12 nennt wörtlich
`pnpm db:push` im Setup-Einzeiler; Phase 1 verlangt aber den partiellen Unique-Index
(`one_active_absence`) als Raw-SQL-Migration. Ein echtes `prisma db push` würde die
`migrations/`-Historie ignorieren und den Index stillschweigend nicht anlegen. Das Skript heißt
weiterhin `db:push` (Wortlaut bleibt gültig), ruft intern aber `prisma migrate deploy` auf.
Zusätzlich `db:migrate` (= `prisma migrate dev`, für neue Migrationen in der Entwicklung) und
`db:generate` (= `prisma generate`).

**Zusätzliches Modell `PasswordResetToken`.** PROMPT.md Abschnitt 4 vergibt kein Datenmodell für
den in Abschnitt 8/Phase 1 geforderten Passwort-vergessen-Flow ("Token in DB"). Ergänzt um
`id, userId, tokenHash, expiresAt, usedAt, createdAt` — der Rohwert des Tokens wird nur per Link
verschickt, in der DB liegt ausschließlich dessen SHA-256-Hash (`src/lib/tokens.ts`).

**Rate-Limiting über `AuditLog` statt eigenem Zähler-Modell.** Fehlgeschlagene Logins schreiben
einen `AuditLog`-Eintrag (`action: "LOGIN_FAILED"`, `metadata: {email}`, `ip`); die Prüfung
(`src/lib/audit.ts#isLoginRateLimited`) zählt solche Einträge der letzten 15 Minuten für E-Mail
oder IP über die reine, unit-getestete Funktion `isRateLimited` aus `src/domain/rate-limit.ts`.
Kein Redis, kein separates Zähler-Modell — passt zum vorgegebenen Stack und zur ohnehin
geforderten Audit-Protokollierung.

**Idle-/Absolut-Timeout im `jwt`-Callback, nicht im `session`-Callback.** Auth.js' `jwt`-Callback
ist laut Typdefinition offiziell dafür vorgesehen, `null` zurückzugeben, um eine Session zu
invalidieren (`Awaitable<JWT | null>`); der `session`-Callback erlaubt das typseitig nicht
(`Awaitable<Session | DefaultSession>`). Die eigentliche Zeitprüfung steckt in der reinen,
unit-getesteten Funktion `isSessionExpired()` (`src/domain/session.ts`); der Callback selbst
pflegt nur rollierende `loginAt`/`lastActiveAt`-Zeitstempel im Token. Ein Live-E2E-Test über eine
echte Stunde Inaktivität ist nicht praktikabel und wurde nicht versucht.

**JWT-Zusatzfelder (`role`, `loginAt`, `lastActiveAt`) per lokalem Intersection-Type statt
globaler Typ-Augmentation.** `declare module "next-auth/jwt" { interface JWT {...} }`
(offiziell dokumentiertes Muster) greift bei dieser next-auth-Version nicht: `next-auth/jwt`
re-exportiert `JWT` per `export * from "@auth/core/jwt"`, und TypeScript merged
Interface-Deklarationen über einen Wildcard-Re-Export nicht in den Originaltyp (verifiziert durch
`tsc`-Fehler: `token.role` blieb `unknown`). Die `Session`/`User`-Augmentation über
`declare module "next-auth"` funktioniert dagegen, da `next-auth` diese Typen per benanntem
`export type { Session, User, ... }` re-exportiert. Betroffene JWT-Felder werden daher in
`src/auth.config.ts` lokal per `token as typeof token & Partial<SessionMeta>` behandelt.

**Middleware bleibt auf der Edge-Runtime, kein Prisma/pino im `jwt`/`session`-Callback von
`auth.config.ts`.** Ein Versuch, `middleware.ts` testweise per `export const config = { runtime:
"nodejs" }` auf die Node.js-Runtime umzustellen, führte in dieser Next.js-Version dazu, dass die
Middleware beim Build komplett aus dem Manifest verschwand (vermutlich hinter einem nicht
aktivierten Experimental-Flag). Da `auth.config.ts` (Provider-lose Basis-Konfiguration, von
`middleware.ts` **und** `auth.ts` verwendet) dadurch Edge-tauglich bleiben muss, verzichtet der
`jwt`-Callback dort bewusst auf den pino-Logger (Node-only) für die Session-Timeout-Diagnose.

**`trustHost: true` für Auth.js.** Ohne festes `AUTH_URL` (Selbst-Hosting per docker-compose ohne
bekannte externe URL zur Build-/Startzeit) meldet Auth.js sonst `UntrustedHost` für jede Anfrage.
Unkritisch, da ausschließlich der Credentials-Provider verwendet wird — kein OAuth-Redirect-Flow,
bei dem Host-Header-Spoofing eine Rolle spielen könnte.

**Minimale UI-Primitive (`Button`, `Input`, `Label`) selbst geschrieben statt per
`shadcn add`.** Aus demselben Grund wie in Phase 0 (`ui.shadcn.com` blockiert) wurden die für die
Login-/Passwort-Formulare benötigten Komponenten manuell im shadcn/ui-typischen Stil
(`class-variance-authority` + `cn()`) angelegt, kompatibel mit der bereits vorhandenen
`components.json`-Konfiguration.

## Phase 2

**Selbst geschriebenes Bottom-Sheet (`src/components/ui/sheet.tsx`) statt Radix Dialog.** Aus
demselben Grund wie die übrigen UI-Primitive (`ui.shadcn.com`/Radix-Pakete nicht zuverlässig
erreichbar) wurde ein minimales, aber vollständiges Modal selbst gebaut: `createPortal` nach
`document.body`, `role="dialog"`/`aria-modal`, Schließen per Escape-Taste und Backdrop-Klick,
`env(safe-area-inset-bottom)` für die Innenabstände. Erfüllt die in Abschnitt 7 geforderte
Bottom-Sheet-UX ohne zusätzliche, in dieser Umgebung nicht sicher installierbare Abhängigkeit.

**Quick-Rückkehr-Chips als eigene, reine Domänenfunktion (`src/domain/quick-return-times.ts`).**
Die in Abschnitt 7 genannten Beispiel-Chips ("+2 h", "+4 h", "Heute 21:30", "Sonntag 18:00") werden
nicht hartkodiert, sondern aus `now` und dem Setting `curfewTime` abgeleitet: Der "Heute"-Chip ist
`curfewTime − 30 min` (bei `curfewTime = "22:00"` ergibt das exakt das im Auftrag genannte
"21:30") und weicht auf "Morgen" aus, wenn die Zeit für heute schon vorbei ist; "Sonntag 18:00"
springt entsprechend auf den nächsten Sonntag. Zeitberechnung ausschließlich über UTC-Getter/
-Setter auf dem von `date-fns-tz#toZonedTime` verschobenen Datum, damit das Ergebnis unabhängig von
der Systemzeitzone des ausführenden Prozesses korrekt ist (durch Unit-Tests mit fixen Daten
abgesichert). Die Chips werden clientseitig mit dem tatsächlichen Anzeigezeitpunkt berechnet (nicht
serverseitig zum Seitenaufruf), damit sie beim Öffnen des Sheets aktuell sind.

**`<input type="datetime-local">` für die freie Zeitwahl wird ohne Zeitzonen-Konvertierung
geparst.** Der Wert eines `datetime-local`-Feldes hat keine Zeitzoneninformation und wird vom
Browser als lokale Zeit _des Geräts_ interpretiert — da dieser Wert ausschließlich clientseitig in
ein `Date` umgewandelt wird (`new Date(value)`), ist das exakt die tatsächliche Absicht des Nutzers
an seinem eigenen Gerät. Eine explizite Europe/Berlin-Konvertierung ist hier bewusst nicht nötig
und würde bei falsch eingestellten Geräte-Zeitzonen sogar falsche Werte erzeugen.

**Zwei-Grenzen-Validierung für `plannedReturnAt`/`newReturnAt`.** Abschnitt 3.3 nennt eine feste
Obergrenze (max. 14 Tage), das Setting `maxPlannedDurationHours` (Default 72 h) ist eine zusätzliche,
administrativ konfigurierbare (meist engere) Grenze. Die feste 14-Tage-Grenze steckt direkt im
Zod-Schema (`src/lib/validation/absence.ts`, immer gültig, unabhängig von der DB), die
Setting-Grenze wird zusätzlich in der Server Action geprüft (dort ist die aktuelle Einstellung
bekannt) — beide Fehlermeldungen sind eigenständig und verständlich.

**`/benachrichtigungen` bereits in Phase 2, aber bewusst minimal.** Abschnitt 6 verlangt die
Bottom-Navigation mit 4 Tabs (inkl. "Benachrichtigungen"), Abschnitt 9/Phase 2 nennt
Benachrichtigungen aber nicht explizit im Aufgabenkatalog — die automatische Erzeugung
(Erinnerungen, Überfälligkeits-Meldungen) ist erst Phase 6. Die Seite liest echt aus der
`Notification`-Tabelle (aktuell naturgemäß leer) und kann bereits als gelesen markiert werden; das
ist kein Platzhalter im verbotenen Sinn, sondern der für diese Phase korrekte, funktionale Umfang.

**Dark-Mode-Toggle mit `localStorage` + Anti-FOUC-Inline-Script.** Wie in der Phase-0-Entscheidung
angekündigt, folgt der manuelle Toggle jetzt mit `/profil` (`src/components/theme-toggle.tsx`).
Ein kleines, synchron ausgeführtes Script am Anfang von `<body>` (`src/app/layout.tsx`) liest die
gespeicherte Präferenz vor dem ersten Paint, um ein kurzes Aufblitzen des falschen Farbschemas zu
vermeiden. Ohne gespeicherte Präferenz bleibt `prefers-color-scheme` (Phase 0) maßgeblich.

**E2E-Test für "eine aktive Abwesenheit" über zwei Browser-Tabs derselben Sitzung.** Der
AUSCHECKEN-Button wird im UI ausgeblendet, sobald eine aktive Abwesenheit existiert — ein einfacher
Klick-Test würde also nie den serverseitigen Schutz (partieller Index `one_active_absence`)
auslösen. Der Test öffnet stattdessen zwei Tabs mit derselben (Cookie-)Sitzung: Tab A checkt aus,
Tab B zeigt noch den veralteten ANWESEND-Stand und versucht ebenfalls auszuchecken — das simuliert
einen echten Wettlauf (zwei Geräte/Reiter) und prüft damit tatsächlich die DB-Konstraint samt
kontrollierter Fehlerbehandlung, nicht nur das clientseitige Ausblenden des Buttons.

## Phase 3

**`/staff/abwesend` und `/staff/ueberfaellig` sind disjunkt.** Beide Seiten filtern dieselbe Menge
aktiver Abwesenheiten über `deriveStatus` (`src/lib/staff-queries.ts#getActiveAbsencesByStatus`) —
ein Schüler erscheint nie in beiden Listen gleichzeitig, passend zu den getrennten Routen aus
Abschnitt 6.

**Korrektur- und Stornier-UI als wiederverwendbare Komponenten.** `AbsenceCorrectionSheet` bearbeitet
sowohl die aktuell aktive Abwesenheit als auch einzelne Historieneinträge auf der Schülerdetailseite
— eine Formularimplementierung für beide Fälle. Eine Korrektur, die `checkedInAt` entfernt, macht
eine abgeschlossene Abwesenheit wieder aktiv (und umgekehrt); das kann laut Abschnitt 3.2 die
`one_active_absence`-Regel verletzen, wenn der Schüler zwischenzeitlich bereits eine neue aktive
Abwesenheit hat — dieser Fall wird wie beim Auschecken sauber abgefangen (`P2002` →
kontrollierte Fehlermeldung statt Exception).

**Verlängerungsfreigabe ohne eigene Übersichtsseite.** Abschnitt 6 sieht dafür keine eigene Route
vor. Offene Anfragen erscheinen stattdessen als Kurzliste auf `/staff` (Dashboard) und als Aktion
(„Genehmigen"/„Ablehnen") direkt auf der jeweiligen Schülerseite — keine zusätzliche, im Auftrag
nicht vorgesehene Route.

**Audit-Log-Verifikation im E2E-Test per direkter Prisma-Abfrage.** Eine Admin-Audit-Log-**Ansicht**
ist laut Abschnitt 6 erst Teil von Phase 4. Der Playwright-Test für „Mitarbeiter korrigiert eine
Rückkehrzeit → Audit-Log enthält Vorher/Nachher" instanziiert dafür einen eigenen `PrismaClient`
und liest den geschriebenen `AuditLog`-Eintrag direkt aus der Test-Datenbank — Backend-Zustand
verifizieren, ohne auf eine noch nicht existierende UI zu warten.

**Jeder E2E-Test verwendet einen eigenen, in keinem anderen Testfall mutierten Schüler.** Ein
anfänglich flakiger Testlauf (Audit-Log wurde im parallelen 2-Worker-Lauf gelegentlich nicht
gefunden) ließ sich auf zwei Ursachen zurückführen: den mehrdeutigen `.first()`-Selektor für den
„Bearbeiten"-Button (Schüler haben durch die zufällige Seed-Historie oft mehrere solcher Buttons —
jetzt gezielt auf den Abschnitt „Aktuelle Abwesenheit" eingegrenzt) sowie einen Schüler
(`finn.r`), der gleichzeitig von `e2e/absences.spec.ts` mutiert wurde. Der Fremd-Einchecken-Test
nutzt seitdem `mia.h`, der in keiner anderen Testdatei vorkommt; zusätzlich pollt die
Audit-Log-Abfrage kurz nach, um unter Last robust zu bleiben.

## Phase 4

**SSE über serverseitiges DB-Polling, kein Pub/Sub.** CLAUDE.md schließt Redis explizit aus. Der
Route Handler `/api/v1/stream` pollt daher selbst alle 1,5 s die Datenbank
(`getLiveOverviewSnapshot()`) und streamt den vollen Snapshot an jeden verbundenen Client — bei der
in PROMPT.md beschriebenen Größenordnung (ein Internat, eine Handvoll gleichzeitiger
Admin-Sessions) unproblematisch. Damit liegt die Aktualisierung deutlich innerhalb der geforderten
2 Sekunden (Abschnitt 7), ohne zusätzliche Infrastruktur.

**Filter/Sortierung laufen clientseitig auf dem SSE-Snapshot, nicht als Server-Roundtrip.** Reine
Funktionen dafür stehen in `src/domain/live-overview.ts` (`filterLiveOverviewRows`,
`sortLiveOverviewRows`) und sind ohne DB unit-testbar. Ein neuer Snapshot vom Server ersetzt nur die
Rohdaten; Filter/Sortierung wenden sich augenblicklich erneut an, ohne eigene Serveranfrage — das
hält die Reaktionszeit unabhängig von Netzwerklatenz.

**Live-Updates: SSE + 30-Sekunden-Fallback-Polling per Server Action statt eigenem
JSON-Endpunkt.** Der Client hält zusätzlich zur `EventSource`-Verbindung ein 30-Sekunden-Intervall,
das dieselbe Query (`getLiveOverviewSnapshotAction`) über eine Server Action aufruft. Das ist ein
reines Sicherheitsnetz für den Fall, dass die SSE-Verbindung unbemerkt hängen bleibt (Proxy,
Firewall) — ein separater, nicht-streamender REST-Endpunkt wäre reine Duplikation derselben
Abfrage.

**Admin-Nutzer-Verwaltung setzt Passwörter nie direkt, sondern löst denselben
Reset-Link-Flow wie „Passwort vergessen" aus.** So geht niemals ein Klartext-Passwort durch
Admin-Hände oder ins Audit-Log; "Passwort zurücksetzen" (Rechte-Matrix) erzeugt lediglich ein
`PasswordResetToken` und verschickt den Link per `ConsoleMailer`, exakt wie beim
Nutzer-Self-Service-Flow aus Phase 1.

**Rollenwechsel nur zwischen Mitarbeiter und Admin, nicht für Schüler.** `/admin/schueler` und
`/admin/mitarbeiter` sind laut Abschnitt 6 getrennte Seiten mit unterschiedlichem Zweck — Schüler
bleiben immer `STUDENT` (kein Rollen-Dropdown in dieser Liste), während `/admin/mitarbeiter` ein
Umschalten zwischen `STAFF`/`ADMIN` je Zeile erlaubt. Das deckt den in der Praxis relevanten
Anwendungsfall ab, ohne eine in Abschnitt 5 nicht näher spezifizierte Rollenmatrix (z. B. Schüler zu
Mitarbeiter befördern) zu erfinden.

**Admin kann das eigene Konto nicht deaktivieren, löschen oder umrollen.** Eine
Selbstaussperrung wäre sonst mit einem einzigen Fehlklick möglich und ließe sich ohne
Datenbankzugriff nicht mehr rückgängig machen — die Server Actions in `src/actions/admin-users.ts`
lehnen das serverseitig ab (nicht nur UI-seitig ausgeblendet).

**Korrekturen von Abwesenheiten bleiben auf `/staff/schueler/[id]`, keine zweite Korrektur-UI unter
`/admin`.** Die Rechte-Matrix erlaubt Admins denselben Zugriff wie Mitarbeitern
(`CORRECT_OR_CANCEL_ABSENCE`, `CHECK_IN_OTHER_STUDENT`); `/admin/abwesenheiten` verlinkt für Details
und Korrekturen daher auf dieselbe, in Phase 3 gebaute Seite statt eine Kopie zu pflegen. Nur die
Admin-weite Live-Übersicht (`/admin`) hat eine eigene, SSE-gestützte Tabelle mit eigenem
„Einchecken"-Button — das ist explizit in Abschnitt 7 gefordert.

**Admin-Navigation verlinkt nur Seiten dieser Phase.** `/admin/statistiken` (Phase 5) und
`/admin/benachrichtigungen` (Phase 6) fehlen bewusst in `src/app/admin/layout.tsx` — CLAUDE.md
verbietet Platzhalter-Komponenten im Endstand einer Phase; dasselbe Muster wurde bereits in Phase 3
für die Mitarbeiter-Navigation angewendet.

**Playwright: `workers: 1` immer, nicht nur in CI.** Alle E2E-Tests teilen sich dieselbe
Dev-Datenbank und die exakt 5 fixen Seed-Schüler aus Abschnitt 10 — es gibt keine „freien" Schüler
mehr, die ein neuer Test unabhängig mutieren könnte. Der neue Zwei-Kontexte-Test für die
Live-Übersicht (`e2e/admin.spec.ts`) nutzt `finn.r`, der bereits von `e2e/absences.spec.ts` benutzt
wird — mit genau einem Worker laufen alle Tests strikt nacheinander, sodass `finn.r` zu Beginn jedes
weiteren Tests immer im Zustand ANWESEND ist (Ausgangszustand laut Seed **und** Endzustand nach dem
Test in `absences.spec.ts`), unabhängig von der Ausführungsreihenfolge der Dateien. Echte
Parallelität böte für dieses kleine Projekt keinen Laufzeitvorteil, der das Konfliktrisiko
rechtfertigen würde.

**Audit-Log-Ansicht ohne DB-Relation zu `User`.** `AuditLog.actorId`/`targetUserId` sind laut Schema
reine String-Felder ohne Fremdschlüssel (bewusst so in Phase 1 angelegt, u. a. damit Log-Einträge
auch nach einem harten Löschen — Phase 7 — lesbar bleiben). `/admin/audit` löst Namen daher über
eine einzelne `findMany({ id: { in: [...] } })`-Abfrage aller in der geladenen Seite vorkommenden
IDs auf, statt pro Zeile einzeln nachzuladen.
