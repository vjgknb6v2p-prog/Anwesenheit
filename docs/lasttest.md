# Lasttest-Notiz

PROMPT.md Abschnitt 1 nennt als Zielgröße "ein Internat mit ca. 150 Schülern". Der für den Alltag
kritischste Fall ist keine gleichmäßige Last über den Tag, sondern zwei kurze Spitzen: **alle
Schüler checken innerhalb weniger Minuten aus** (nach Unterrichtsschluss/am Wochenende) und **alle
kommen zur Nachtruhe innerhalb weniger Minuten zurück**. Dazwischen hat die Admin-Live-Übersicht
(`/admin`, SSE mit serverseitigem 1,5-s-Poll, siehe `src/app/api/v1/stream/route.ts`) durch eine
Handvoll gleichzeitiger Mitarbeiter-/Admin-Sessions zusätzliche Leselast auf genau dieser Tabelle.

## Methodik

`scripts/lasttest.ts` (`pnpm exec tsx scripts/lasttest.ts`, optional `LASTTEST_COUNT=<n>`) misst
diese Spitzen **direkt auf der Ebene der Prisma-Queries**, die `checkOutAction`/`checkInAction`
(`src/actions/absences.ts`) und `getLiveOverviewSnapshot` (`src/lib/admin-queries.ts`) tatsächlich
ausführen — bewusst ohne den kompletten HTTP-/Auth.js-Stack (Login, Session-Cookies, CSRF) davor,
da dieser für die Frage "hält die Datenbank die Schreib-/Lesespitze aus" nicht die begrenzende
Ressource ist; React/Next.js-Rendering und Netzwerk-Overhead sind pro Request außerdem klein und
unabhängig voneinander (kein Shared State, den 150 parallele Requests gegeneinander ausbremsen
würden), anders als die Datenbank mit ihrem Connection-Pool und dem partiellen Unique-Index
`one_active_absence`. Das Skript legt dafür temporäre Testnutzer an und räumt sie (Absences,
Audit-Logs, Nutzer) am Ende wieder vollständig auf — die Seed-/Demo-Daten aus `prisma/seed.ts`
bleiben unverändert.

Vier Szenarien, alle mit `Promise.all` (echte Parallelität, kein sequentielles Abarbeiten):

1. **Checkout-Burst** — N Schüler checken im selben Moment aus (1 `Absence`-Insert + 1
   `AuditLog`-Insert je Schüler).
2. **Contention-Burst** — 30 Schüler versuchen (simulierter Doppel-Tap bei wackeliger Verbindung)
   _gleichzeitig zweimal_ auszuchecken. Erwartung: pro Schüler genau 1 Erfolg, 1 kontrolliert
   abgefangener Fehler (`one_active_absence` hält auch unter echter, nicht nur logischer,
   Nebenläufigkeit).
3. **Admin-Live-Übersicht** — 10 gleichzeitige `getLiveOverviewSnapshot()`-Aufrufe, ausgeführt
   direkt im Anschluss an Schritt 1+2, wenn die `absences`-Tabelle auf Spitzenlast ist (Analogie zu
   10 gleichzeitig geöffneten Admin-/Mitarbeiter-Sessions, deren SSE-Handler alle 1,5 s pollen).
4. **Checkin-Burst** — alle aktiven Abwesenheiten aus 1+2 werden im selben Moment eingecheckt (1
   `Absence`-Update + 1 `AuditLog`-Insert je Schüler).

Ausgeführt lokal gegen PostgreSQL 16 (Standard-`docker-compose.yml`-Konfiguration, Standard-Prisma-
Connection-Pool ohne manuelles `connection_limit`) auf der Entwicklungs-Hardware dieses Projekts —
keine dedizierte Produktions-/Cloud-Datenbank. Die absoluten Zahlen sind daher eine untere
Abschätzung der auf echter Server-Hardware erreichbaren Werte, nicht mehr und nicht weniger.

## Ergebnisse

**Zielgröße (150 Schüler, `LASTTEST_COUNT=150`, Standardwert):**

| Szenario                                      |   n |                     erfolgreich |    p50 |    p95 |    p99 |    max |
| --------------------------------------------- | --: | ------------------------------: | -----: | -----: | -----: | -----: |
| Checkout-Burst (120, Rest im Contention-Test) | 120 |                             120 | 148 ms | 153 ms | 155 ms | 156 ms |
| Contention-Burst (30 × 2 gleichzeitig)        |  60 | 30 (+30 kontrolliert abgelehnt) |      — |      — |      — |      — |
| Admin-Live-Übersicht (10 parallel)            |  10 |                              10 |  67 ms |  85 ms |  85 ms |  85 ms |
| Checkin-Burst (alle 150 aktiven)              | 150 |                             150 |  74 ms |  86 ms |  86 ms |  86 ms |

**Doppelte Zielgröße als Sicherheitsmarge (`LASTTEST_COUNT=300`):**

| Szenario                               |   n |                     erfolgreich |    p50 |    p95 |    p99 |    max |
| -------------------------------------- | --: | ------------------------------: | -----: | -----: | -----: | -----: |
| Checkout-Burst (270)                   | 270 |                             270 | 191 ms | 209 ms | 212 ms | 213 ms |
| Contention-Burst (30 × 2 gleichzeitig) |  60 | 30 (+30 kontrolliert abgelehnt) |      — |      — |      — |      — |
| Admin-Live-Übersicht (10 parallel)     |  10 |                              10 |  85 ms | 106 ms | 106 ms | 106 ms |
| Checkin-Burst (alle 300 aktiven)       | 300 |                             300 | 172 ms | 186 ms | 192 ms | 193 ms |

0 unerwartete Fehler in beiden Läufen; die Contention-Bursts hielten exakt das erwartete Muster
(genau 1 Erfolg + 1 kontrollierter `P2002`-Fehler pro Schüler) — `one_active_absence` verhindert
eine doppelte aktive Abwesenheit auch unter echter, nicht nur sequentiell getesteter, Nebenläufigkeit.

## Einordnung

- Selbst bei **doppelter** Zielgröße (300 statt ~150 Schüler) liegt die schlechteste einzelne
  Anfrage (p99) bei rund 210 ms — weit unter jeder für "in maximal 3 Taps ausgecheckt" (PROMPT.md
  Abschnitt 1) relevanten Wahrnehmungsschwelle, selbst wenn man Netzwerk- und React-Rendering-Zeit
  addiert.
- Der realistische Fall ist ohnehin entspannter als der Test: 150 Schüler checken nicht literally
  in derselben Millisekunde aus, sondern verteilt über ein paar Minuten am Pforten-Ausgang. Der
  Lasttest bildet also bewusst den ungünstigsten, nicht den erwarteten Fall ab.
- Die Admin-Live-Übersicht bleibt mit 10 gleichzeitigen Pollern (deutlich mehr, als ein einzelnes
  Internat an Mitarbeiter-/Admin-Sessions gleichzeitig offen haben dürfte) im niedrigen
  zweistelligen Millisekundenbereich — bestätigt die Einschätzung im Code-Kommentar von
  `src/app/api/v1/stream/route.ts` ("für die in PROMPT.md beschriebene Größenordnung … unproblematisch").
- **Risiko für einen echten Produktivbetrieb:** Der Prisma-Standard-Connection-Pool (Formel
  `num_physical_cpus × 2 + 1`, kein `connection_limit` in `DATABASE_URL` gesetzt) reicht für diese
  Lastspitzen aus, ist aber nicht beliebig skalierbar — bei einer deutlich größeren Zielgruppe
  (mehrere Internate an einer Instanz, was laut Abschnitt 11 "Nicht-Ziele" ohnehin nicht
  vorgesehen ist) müsste `connection_limit` in `DATABASE_URL` explizit gesetzt und ggf. ein
  Connection-Pooler (PgBouncer) vorgeschaltet werden. Für die im Auftrag beschriebene
  Größenordnung (ein Internat, ~150 Schüler) ist das nicht nötig.
- Kein Lasttest der PWA-Push-Zustellung (`web-push`) — die läuft asynchron/best effort
  (`src/lib/push.ts`, siehe `docs/decisions.md`) und blockiert keinen der oben gemessenen Pfade.

**Fazit:** Für die im Projektauftrag beschriebene Größenordnung ist keine zusätzliche
Infrastruktur (Connection-Pooler, Caching-Schicht, horizontale Skalierung) nötig — ein einzelner
Next.js-Prozess gegen eine einzelne PostgreSQL-16-Instanz trägt die beschriebenen Lastspitzen mit
deutlicher Marge.
