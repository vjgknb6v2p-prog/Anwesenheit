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
