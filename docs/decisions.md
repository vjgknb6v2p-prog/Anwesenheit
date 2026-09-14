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
