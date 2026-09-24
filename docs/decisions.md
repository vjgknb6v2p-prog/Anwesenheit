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

## Phase 5

**`/staff/statistiken` zusätzlich zu `/admin/statistiken`.** Abschnitt 6 listet für Mitarbeiter
keine eigene Statistik-Route, die Rechte-Matrix (Abschnitt 5) gibt Mitarbeitern aber ausdrücklich
Zugriff auf Statistiken „nur für den eigenen Wohnbereich". Beide Seiten nutzen dieselbe
Aggregationslogik (`src/lib/stats-queries.ts#getStatsSummary`); `/staff/statistiken` setzt
`residentialAreaId` serverseitig hart auf den Wohnbereich des angemeldeten Mitarbeiters (kein
Filter-UI, kein Zugriff auf fremde Bereiche), `/admin/statistiken` bekommt zusätzlich ein
Wohnbereichs-Dropdown wie die Live-Übersicht aus Phase 4. Ein Mitarbeiter ohne zugewiesenen
Wohnbereich sieht einen Hinweistext statt eines Fehlers oder leerer Diagramme ohne Erklärung.

**Stornierte Abwesenheiten fließen in keine Statistik ein.** Sie haben nicht stattgefunden — alle
Aggregationsfunktionen in `src/domain/stats.ts` filtern `status: "CANCELLED"` intern heraus, bevor
irgendetwas gezählt wird.

**Ø-Dauer und „verspätete Rückkehren" zählen nur abgeschlossene Abwesenheiten
(`checkedInAt` gesetzt).** Eine noch laufende (`ACTIVE`, ggf. bereits überfällige) Abwesenheit hat
keine finale Dauer und ist kein abgeschlossener „verspäteter" Fall — beides würde die Kennzahl
verzerren, wenn man sie anhand der bisher verstrichenen Zeit mitzählen würde. `totalAbsences`
(„Abwesenheiten gesamt") zählt dagegen weiterhin alle nicht-stornierten Abwesenheiten im Zeitraum,
unabhängig vom Abschluss-Status.

**Bucketing für „pro Tag/Woche/Monat" in Europe/Berlin, nicht UTC.** Wie schon bei den
Quick-Return-Zeiten (Phase 2, `src/domain/quick-return-times.ts`) würde ein Bucketing nach reinem
UTC-Kalendertag Abwesenheiten, die spätabends in Berlin stattfinden, dem falschen Tag zuordnen.
`periodStart()` in `src/domain/stats.ts` nutzt denselben UTC-Getter/-Setter-Trick auf dem per
`toZonedTime` verschobenen Datum; Wochen beginnen montags (ISO).

**Default-Zeitraum: letzte 30 Tage.** Ohne expliziten Zeitraumfilter würden alle ~60 über 90 Tage
verteilten Seed-Abwesenheiten (Abschnitt 10) auf einmal geladen — 30 Tage zeigen sofort etwas
Sinnvolles, ohne die Seite standardmäßig mit der kompletten Historie zu überladen
(`defaultStatsRange()` in `src/lib/stats-queries.ts`).

**CSV-Export als eine Datei mit mehreren Abschnitten, kein zusätzliches Package.** Der Export
(`/api/v1/export/statistiken`) enthält Zeitraum, die drei Kennzahlen sowie je einen Block für
„pro Zeitraum", „nach Grund" und „nach Schüler", getrennt durch Leerzeilen, RFC-4180-konform manuell
escaped. Für dieses überschaubare, feste Format lohnt sich keine zusätzliche CSV-Bibliothek. Für
Mitarbeiter überschreibt der Route Handler einen mitgegebenen `residentialAreaId`-Parameter
serverseitig auf den eigenen Wohnbereich — dieselbe Regel wie auf der Seite, nicht nur clientseitig
ausgeblendet.

## Phase 6

**Hand geschriebener Service Worker statt `next-pwa`.** `next-pwa` (und sein aktiv gepflegter Fork
`@ducanh2912/next-pwa`) hakt sich per `next.config.js#webpack()`-Callback in den Build ein und lässt
Workbox darüber den Service Worker generieren. Dieses Projekt baut aber mit `next build --turbopack`
(seit Phase 0 so festgelegt) — Turbopack führt die `webpack()`-Konfiguration nicht aus, wodurch
`next-pwa` mit Turbopack grundsätzlich unvereinbar ist. Ein Wechsel zurück auf Webpack für den Build
wäre eine Regression der in Phase 0 getroffenen Stack-Entscheidung. Stattdessen liegt unter
`public/sw.js` ein kleiner, von Hand geschriebener Service Worker (Install/Activate/Fetch/Push/
Notificationclick, keine externe Workbox-Laufzeitbibliothek) — bewusst minimal, da der überwiegende
Teil der App personenbezogene Live-Daten zeigt und aggressives Caching diese veraltet ausliefern
würde. Analog zur shadcn/ui-Entscheidung aus Phase 0 wird die Stack-Zeile in `CLAUDE.md` dadurch
nicht geändert (next-pwa bleibt die im Auftrag genannte Referenz), die tatsächliche Umsetzung weicht
aus demselben technischen Grund ab.

**App-Icons per `next/og` `ImageResponse` statt Bild-Tool.** Diese Sandbox hat weder ImageMagick
noch eine Node-Bildbibliothek (`sharp` u. Ä.) installiert. `next/og`s `ImageResponse` (Next-Bordmittel,
Satori-basiert) rendert JSX zu PNG zur Laufzeit — genutzt in `src/app/icon-192.png/route.tsx` und
`icon-512.png/route.tsx`. Bewusst rein geometrisch (farbiger Grund + weißer Punkt, passend zum
Status-Punkt-Motiv aus `StatusBadge`), damit keine Schriftart geladen werden muss. `#2563eb` ist
eine feste Hex-Näherung an `--status-info` (`globals.css`, dort als `oklch()` definiert) — Manifest
`theme_color` und Icon-Hintergrund brauchen einen konkreten CSS-Farbwert.

**`/manifest.webmanifest`, Icons, `/offline` und `/sw.js` öffentlich (PUBLIC_PATHS in
`src/auth.config.ts`).** Ohne das würde die Auth-Middleware jede Anfrage ohne Session dorthin zu
`/login` umleiten — auch die des Service Workers selbst beim Installieren (`cache.addAll(...)` lädt
z. B. die Offline-Seite bereits vor jedem Login). `/api/v1/cron/tick` ist aus demselben Grund
öffentlich: der Aufrufer ist kein Browser mit Session, sondern ein externer Scheduler mit eigener
Auth (`CRON_SECRET`-Header, vom Route Handler selbst geprüft).

**Idempotenz des Cron-Tick über einen DB-Unique-Index, nicht `findFirst` + `create`.** Neue Spalte
`Notification.sourceId` (Migration `add_notification_source_id`) plus
`@@unique([userId, type, sourceId])`. Der Route Handler versucht `create` und fängt `P2002` ab
(exakt das Muster von `one_active_absence` aus Phase 1) — race-sicher, falls zwei Cron-Aufrufe sich
zeitlich überlappen, was ein vorheriges `findFirst` nicht garantieren könnte.

**`overdueGraceMinutes` steuert den Versand-Zeitpunkt der Überfälligkeits-Meldung, nicht
`deriveStatus()`.** Das Setting existierte seit Phase 1 in `AppSettings`, wurde aber nirgends
gelesen. Abschnitt 3 legt den angezeigten Status ausdrücklich ohne Karenzzeit fest ("ÜBERFAELLIG:
... `plannedReturnAt < now()`") — die Karenzzeit gilt daher nur für die _Benachrichtigung_
(`shouldSendOverdueNotice()` in `src/domain/notification-rules.ts`), nicht für den in der UI
angezeigten Badge.

**Mitarbeiter-Sammelmeldung dedupliziert über ein Stunden-Zeitfenster
(`hourBucketKey()`), nicht pro Cron-Lauf.** Bei einem alle 5 Minuten laufenden Tick (README.md)
und weiterhin überfälligen Schülern würde ohne dieses Fenster bis zu zwölfmal pro Stunde dieselbe
Meldung verschickt. Die `sourceId` der Sammelmeldung ist der ISO-Zeitstempel des Stundenbeginns —
ändert sich die Anzahl überfälliger Schüler oder beginnt eine neue Stunde, entsteht eine neue,
separat zählende Meldung.

**`/staff/benachrichtigungen` und `/admin/benachrichtigungen` zusätzlich zu
`/benachrichtigungen`.** Abschnitt 6 listet nur für Schüler und Admin eine Benachrichtigungs-Route
explizit; die Mitarbeiter-Sammelmeldung (Abschnitt 8) braucht aber einen Zugriffspunkt für
Mitarbeiter. Alle drei Seiten teilen sich `src/components/notifications-list.tsx` und
`PushSubscriptionToggle` — nur der Datenzugriff (`requireRole`, gefiltert auf `userId`) unterscheidet
sich.

**Web-Push-Versand ist best effort und wirft nie.** `src/lib/push.ts#sendWebPushToUser()` bricht
ohne konfigurierte VAPID-Keys oder ohne Abonnements früh und lautlos ab (Abschnitt 8: "Kein Fehler,
wenn Push nicht verfügbar ist") und räumt bei einer `404`/`410`-Antwort des Push-Dienstes
automatisch die zugehörige `PushSubscription`-Zeile auf (Standard-Interpretation: Abonnement nicht
mehr gültig), statt sie bei jedem künftigen Tick erneut erfolglos zu versuchen.

**`NEXT_PUBLIC_VAPID_PUBLIC_KEY` statt `VAPID_PUBLIC_KEY`.** Der Browser muss den Public Key kennen,
um `pushManager.subscribe({ applicationServerKey })` aufzurufen — ohne `NEXT_PUBLIC_`-Präfix bindet
Next.js eine Variable nicht ins Client-Bundle ein. Unproblematisch, da ein VAPID-Public-Key per
Definition öffentlich ist (nur `VAPID_PRIVATE_KEY` bleibt serverseitig).

**Kein Custom-Install-Button für iOS, aber verpflichtend die Anleitung.** iOS/Safari feuert kein
`beforeinstallprompt` — dort zeigt `InstallPromptBanner` daher immer die "Zum Home-Bildschirm"-
Anleitung (solange die App nicht bereits im Standalone-Modus läuft), während Android/Desktop-Chrome
den nativen `beforeinstallprompt`-Dialog über einen Button auslöst.

## Phase 7

**Hard-Delete-Job als eigener Endpunkt `/api/v1/cron/cleanup`, getrennt von `/api/v1/cron/tick`.**
Beide sind Cron-getriebene Route Handler mit `CRON_SECRET`, aber unterschiedliche Aufgabe und
sinnvolle Frequenz — Erinnerungen/Überfälligkeit alle 5 Minuten (Phase 6), die Aufbewahrungsfrist-
Bereinigung reicht täglich (siehe README.md). Ein gemeinsamer Endpunkt mit Modus-Parameter hätte
keinen Vorteil geboten, aber die einzelne Verantwortlichkeit verwischt.

**`overdueGraceMinutes` bleibt unangetastet, `dataRetentionMonths` ist das neue, siebte Setting.**
Reine Ergänzung von `AppSettings`/`Setting`-Tabelle nach demselben Muster wie die bestehenden
Felder — Default 12 Monate exakt nach PROMPT.md Abschnitt 9. Die Prüfung, ob eine Abwesenheit
löschreif ist, sitzt als reine Funktion in `src/domain/retention.ts`
(`isEligibleForHardDelete`) und schließt `ACTIVE`-Abwesenheiten kategorisch aus — unabhängig vom
Alter von `checkedOutAt` darf eine noch nicht abgeschlossene Abwesenheit nie gelöscht werden.

**Hard-Delete löscht `Absence`-Zeilen tatsächlich, keine Anonymisierung.** PROMPT.md Abschnitt 9
verlangt einen "Hard-Delete-Job" (nicht "Anonymisierungs-Job"). `Extension`-Datensätze kaskadieren
automatisch (`onDelete: Cascade`, bereits seit Phase 1 im Schema); `AuditLog`-Einträge, die die
gelöschte Absence als `targetId` referenzieren, bleiben unverändert erhalten (kein Fremdschlüssel,
siehe Phase-4-Entscheidung dazu) — sie sind der Nachweis, dass und wann die Löschung stattfand, nicht
Teil der zu löschenden personenbezogenen Daten selbst.

**Audit-Log-Vollständigkeit: schreibende _sicherheits-/verwaltungsrelevante_ Aktionen, nicht jede
UI-Zustandsänderung.** PROMPT.md Abschnitt 9 fordert "Audit-Log für alle schreibenden Aktionen
vollständig". Geprüft wurden alle `...Action`-Funktionen in `src/actions/` sowie alle Route
Handler — Korrekturen, Stornierungen, Ein-/Auschecken (eigen und fremd), Verlängerungen/
-genehmigungen, Benutzerverwaltung, Einstellungen/Wohnbereiche, Logins/Passwort-Resets,
Daten-Exporte und die automatisierte Löschung schreiben bereits einen Eintrag. Bewusst **nicht**
auditiert: `markNotificationReadAction` (eigene Benachrichtigung als gelesen markieren) und
`subscribeToPushAction`/`unsubscribeFromPushAction` (Push-Gerät registrieren/abmelden) — beides
rein persönliche UI-Zustände ohne Aufsichts- oder Missbrauchsrelevanz für Dritte, deren
Protokollierung die Tabelle nur mit Rauschen füllen würde, ohne einem Betroffenenrecht oder einer
Nachvollziehbarkeitspflicht zu dienen. Dokumentiert zusätzlich in `docs/datenschutz.md` Abschnitt 10.

**Eigene-Daten-Export unter `/api/v1/export/eigene-daten`, für alle drei Rollen identisch.** Die
Rechte-Matrix (Abschnitt 5) gewährt "Eigene Daten exportieren" gleichermaßen Schülern, Mitarbeitern
und Admins — ein Route Handler mit `requireApiRole("STUDENT", "STAFF", "ADMIN")` (praktisch "jede
angemeldete Rolle") statt drei rollenspezifischer Kopien. Der UI-Einstiegspunkt
(`src/components/data-export-links.tsx`) sitzt auf `/profil` (Schüler, einzige Seite mit
persönlichen Einstellungen) sowie auf den Benachrichtigungsseiten für Mitarbeiter/Admin (die
bislang einzige rollenübergreifende "persönliche" Seite dieser beiden Rollen, siehe Phase-6-
Entscheidung zu `/staff/benachrichtigungen`/`/admin/benachrichtigungen`) — keine neue,
in PROMPT.md nicht vorgesehene Profilseite für Mitarbeiter/Admin nur für diesen einen Zweck.

**Security-Header über `next.config.ts#headers()`, mit `'unsafe-inline'` für `script-src`/
`style-src`.** `headers()` ist reine Next.js-Routing-Konfiguration und funktioniert — anders als
`next-pwa` (Phase 6) — unverändert mit `next build --turbopack`. Der Anti-Flash-Theme-Init-Score im
Root-Layout muss inline vor der Hydration laufen, und React setzt zahlreiche `style`-Props (Live-
Übersicht, Bottom-Nav-`safe-area-inset`, Recharts-SVGs) als echte Inline-Attribute — beides würde
eine strikte, nonce-basierte CSP ohne größeren Umbau (pro Request generierte, durch Middleware und
Layout durchgereichte Nonce) blockieren. Alle anderen Direktiven sind eng gefasst
(`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, keine
externen Quellen). `Strict-Transport-Security` wird unconditional gesetzt — Browser ignorieren den
Header ohnehin, wenn er nicht über HTTPS ausgeliefert wird, ein bedingtes Weglassen für lokale
HTTP-Entwicklung ist daher unnötig.

**Zielorte-Sichtbarkeit verifiziert, keine Code-Änderung nötig.** Alle Vorkommen von
`Absence.destination` im Code (Student-eigene Seiten, Staff-/Admin-Seiten mit
`VIEW_PRESENCE_LIST`/`VIEW_OTHER_HISTORY`) wurden per Volltextsuche geprüft; keine Statistik-,
Export- oder Audit-Log-Ansicht und keine Push-/In-App-Benachrichtigung gibt den Zielort außerhalb
dieser beiden autorisierten Fälle preis (Details in `docs/datenschutz.md` Abschnitt 5).

**RBAC-Matrix-Test iteriert über eine Routentabelle statt 20 Einzeltests.** Die für Phase 7
geforderte Verifikation "für jede Rolle jeden geschützten Endpunkt" ist in `e2e/rbac-matrix.spec.ts`
als eine Datentabelle aller Seiten mit ihren laut Abschnitt 5 erlaubten Rollen umgesetzt; vier Tests
(nicht angemeldet, Schüler, Mitarbeiter, Admin) iterieren jeweils über die komplette Tabelle. Das
deckt 20 Routen × 4 Zugriffs-Zustände ab, ohne 80 nahezu identische Einzeltests zu duplizieren, und
bleibt erweiterbar, sobald neue Seiten hinzukommen.

**Bugfix in `prisma/seed.ts`: `checkedOutAt` der "rechtzeitig abwesend"-Ausgangslage war absolut
statt relativ zu `Date.now()`.** Bei der Verifikation dieser Phase schlug `e2e/staff.spec.ts`
("Korrektur mit Audit-Log") reproduzierbar fehl, sobald das Seed-Skript vor 11:00 Uhr lief: Lenas
initiale aktive Abwesenheit hatte `checkedOutAt: atHour(0, 14, 0)` (heute, fester Zeitpunkt 14:00)
und `plannedReturnAt: Date.now() + 3h`. Lief das Skript z. B. um 06:00 Uhr, ergab das
`plannedReturnAt` ≈ 09:00 — vor dem `checkedOutAt` von 14:00 desselben Tages. Das verletzt die
Domänenregel "geplante Rückkehr muss nach der Auscheckzeit liegen" (`correctAbsenceSchema` in
`src/lib/validation/staff.ts`) schon im Ausgangszustand der Seed-Daten, nicht erst durch eine
Korrektur — jede Korrektur, die (wie im Test) von diesem `plannedReturnAt` ausgeht, scheiterte
serverseitig an genau dieser Validierung. Behoben durch Angleichung an die bereits korrekte
"überfällig"-Ausgangslage direkt darunter: `checkedOutAt: Date.now() - 5h` statt eines festen
Uhrzeit-Werts — damit liegt der Checkout-Zeitpunkt unabhängig von der Tageszeit beim Seeden immer
sicher vor `plannedReturnAt` (`Date.now() + 3h`). Kein Zusammenhang mit den übrigen Phase-7-
Änderungen (Security-Header, Audit-Log, Export) — verifiziert durch mehrfachen, stabil grünen
Lauf der vollständigen E2E-Suite (`pnpm test:e2e`) nach dem Fix.

## Phase 8

**Lasttest misst direkt auf Prisma-Ebene statt über den vollen HTTP-/Auth.js-Stack.**
`scripts/lasttest.ts` (`pnpm test:load`) simuliert die zwei realistischen Lastspitzen eines
Internats mit ~150 Schülern (gleichzeitiges Aus-/Einchecken zu Unterrichtsschluss bzw. zur
Nachtruhe) durch direkte, parallele Aufrufe derselben Prisma-Queries, die `checkOutAction`/
`checkInAction` (`src/actions/absences.ts`) und `getLiveOverviewSnapshot`
(`src/lib/admin-queries.ts`) tatsächlich ausführen — ohne Login/Session/CSRF drumherum. Begründung:
Die Datenbank (Connection-Pool, partieller Unique-Index `one_active_absence` unter Konkurrenz) ist
die einzige Ressource, die bei paralleler Last überhaupt gemeinsam genutzt wird; Next.js-Rendering
und Auth.js-Session-Handling laufen pro Request unabhängig und günstig ab und sind nicht die
begrenzende Größe. Ein vollwertiger HTTP-Lasttest hätte zusätzlich 150 echte, parallele
NextAuth-Credentials-Logins (inkl. CSRF-Token-Handling) simulieren müssen, ohne die eigentliche
Fragestellung ("hält die DB die Schreib-/Lesespitze aus?") genauer zu beantworten. Details,
Methodik und Ergebnisse in `docs/lasttest.md`.

**Lasttest-Skript legt temporäre Testnutzer per Prisma direkt an, nicht über `prisma/seed.ts`.**
CLAUDE.md verlangt "Testdaten ausschließlich in `prisma/seed.ts`" für die Demo-/Entwicklungsdaten
der Anwendung — ein Lasttest-Werkzeug ist davon zu unterscheiden: Es erzeugt keine dauerhaften
Beispieldaten, sondern kurzlebige, klar als `lasttest-*@lasttest.local` markierte Nutzer, die das
Skript am Ende desselben Laufs (Erfolg oder Fehler, `finally`-Block) wieder vollständig entfernt.
Eine Aufnahme in `prisma/seed.ts` wäre hier fachlich falsch, weil Lasttest-Daten nicht Teil des
dauerhaften Entwicklungs-/Demo-Zustands sein sollen.

## Nach Phase 8 (Fix)

**`'unsafe-eval'` in der CSP nur außerhalb von Produktion (`next.config.ts`).** Beim ersten
Test des lokalen Dev-Setups (`next dev --turbopack`) blieb der Login-Button wirkungslos: Turbopacks
Dev-Runtime (Hot Module Replacement, eval-basierte Source-Maps) nutzt `eval()` im Browser, was die
in Phase 7 eingeführte CSP ohne `'unsafe-eval'` blockierte — sichtbar als Chrome-DevTools-"Issue"
("Content Security Policy of your site blocks the use of 'eval' in JavaScript") und als
Redirect-Loop zwischen `/login` und `/admin` durch dadurch kaputten Client-Router-Code. In der
Produktions-E2E-Suite (`pnpm test:e2e`, läuft gegen `pnpm start`) fiel das nicht auf, da
`next build`/`next start` kein `eval()` benötigen. Fix: `script-src` bekommt `'unsafe-eval'` nur,
wenn `process.env.NODE_ENV !== "production"` — Produktion bleibt unverändert streng, lokale
Entwicklung funktioniert wieder. Verifiziert per Playwright-Login-Test gegen `next dev` (kein
CSP-Fehler mehr, landet korrekt auf `/admin`) sowie die vollständige E2E-Suite gegen `pnpm start`
(weiterhin 22/22 grün, mehrfach stabil).

**`turbopack.root` explizit in `next.config.ts` gesetzt.** Der eigentliche Auslöser des
Redirect-Loops (nicht die eval-CSP, siehe Eintrag oben) war eine falsche Root-Erkennung durch
Next.js/Turbopack: Liegt zufällig eine weitere `package-lock.json`/`pnpm-lock.yaml` in einem
Elternverzeichnis des Projekts (z. B. `C:\Users\<name>\package-lock.json` auf Windows), wählt
Next.js dieses Elternverzeichnis als Projekt-Root ("multiple lockfiles"-Warnung beim Start).
Dadurch werden `.env`/`.env.local` am falschen Ort gesucht, `AUTH_SECRET` bleibt leer, Auth.js
wirft serverseitig `MissingSecret`, und jeder Login endet in einer Redirect-Schleife zwischen
`/login` und dem Rollen-Startbereich — ohne jede sichtbare Fehlermeldung im Formular selbst
(nur im Terminal des Dev-Servers sichtbar). Behoben durch `turbopack: { root: process.cwd() }`
in `next.config.ts` — macht die Root-Erkennung deterministisch unabhängig davon, was sonst auf
der Festplatte liegt. `process.cwd()` statt `__dirname`, da `next.config.ts` durch
`"type": "module"` in `package.json` als ESM geladen wird (`__dirname` dort nicht verfügbar) und
`pnpm dev`/`build`/`start` ohnehin immer aus dem Projektverzeichnis heraus aufgerufen werden.

## Erweiterung: Nachrichten & Notfall-Broadcast

**Schüler dürfen nur an Mitarbeiter/Admin schreiben, nicht untereinander.** Ein unbeaufsichtigter
Peer-Chat zwischen Schülern über die Verwaltungs-App wäre ein Aufsichts-/Safeguarding-Risiko, das
über den eigentlichen Zweck der Anwendung (Ausgangsverwaltung) hinausgeht. `canSendMessageTo()` in
`src/domain/messaging.ts` erzwingt das als reine, unit-getestete Funktion; Mitarbeiter und Admin
dürfen an jede Rolle schreiben.

**Rundruf (Notfall-Broadcast) erzeugt eine `Message`-Zeile pro Empfänger statt eines gemeinsamen
Datensatzes mit Empfängerliste.** Damit bleibt der Lesestatus pro Empfänger unabhängig (wie bei
`Notification`), und die bestehende Konversations-/Thread-Logik funktioniert ohne Sonderfall.
`broadcastGroupId` (eine pro Rundruf gemeinsame UUID) verknüpft die zusammengehörigen Zeilen nur
für die Anzeige ("Rundruf"-Kennzeichnung in der UI).

**Rundruf-Zielgruppe: alle Schüler mit einer aktiven Abwesenheit (`status = ACTIVE`), unabhängig
von `plannedReturnAt`.** Sowohl `ABWESEND` als auch `UEBERFAELLIG` sollen im Notfall erreicht
werden — die Unterscheidung ist für diesen Zweck irrelevant. Mitarbeiter erreichen dabei nur den
eigenen Wohnbereich (analog zur bestehenden Wohnbereichs-Einschränkung bei Statistiken), Admin
alle Wohnbereiche.

**Bottom-Nav der Schüler-Ansicht auf 5 Tabs erweitert, bestehende Glocke von "Nachrichten" auf
"Hinweise" umbenannt.** Die ursprüngliche Beschriftung "Nachrichten" für die Glocke
(System-Benachrichtigungen: Erinnerungen, Überfälligkeit) kollidiert semantisch mit der neuen
echten Nachrichtenfunktion zwischen Personen. Die Glocke heißt jetzt "Hinweise", das neue
Sprechblasen-Symbol "Nachrichten" — inhaltlich passender und eindeutig unterscheidbar. Zwei
getrennte Ungelesen-Zähler (`Notification` vs. `Message`), keine Vermischung.

**PWA-Shortcuts (`manifest.ts`) rollenabhängig, da `manifest()` die Session lesen darf.**
`manifest()` läuft als Next.js-Route-Handler pro Request und darf daher `getSessionUser()`
aufrufen (kein einmalig generiertes statisches JSON) — die App-Shortcuts (Homescreen-Icon lang
drücken) zeigen dadurch pro Rolle die jeweils wichtigsten Direktlinks statt eines generischen,
für Mitarbeiter/Admin unpassenden Sets.

**Kalender-Kachel zeigt Abwesenheiten am Auscheck-Tag, nicht über die ganze Dauer verteilt.**
Dieselbe Vereinfachung wie bei `groupAbsencesByPeriod` (Phase 5): eine mehrtägige Abwesenheit
(z. B. Wochenendheimfahrt) erscheint nur am Tag des Auscheckens, nicht an jedem überspannten Tag.
Konsistent mit der bestehenden Statistik-Logik und einfacher zu lesen als ein "Balken über mehrere
Tage"-Kalender, der für diese Nutzergruppe (Mitarbeiter, schneller Überblick) keinen Mehrwert
bietet.
