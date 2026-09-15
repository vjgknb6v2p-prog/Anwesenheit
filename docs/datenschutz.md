# Datenschutz — Verarbeitungsverzeichnis-Entwurf

Dieses Dokument ist ein **Entwurf** für ein Verzeichnis von Verarbeitungstätigkeiten nach Art. 30
DSGVO für den Betrieb von **CheckIn**. Es ersetzt keine Rechtsberatung — vor dem produktiven
Einsatz an einem echten Internat muss ein Verantwortlicher (der Internats-Träger) die Platzhalter
ausfüllen und die Angaben durch eine fachkundige Person prüfen lassen. Grundlage ist der in
[`PROMPT.md`](../PROMPT.md) beschriebene Funktionsumfang und das Datenmodell in
[`prisma/schema.prisma`](../prisma/schema.prisma).

## 1. Verantwortlicher

| Feld                      | Angabe                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| Verantwortlicher          | _[Träger des Internats einsetzen]_                                |
| Vertreten durch           | _[Schulleitung/Geschäftsführung einsetzen]_                       |
| Kontakt                   | _[Adresse, E-Mail, Telefon einsetzen]_                            |
| Datenschutzbeauftragte(r) | _[Name/Kontakt einsetzen, falls nach Art. 37 DSGVO erforderlich]_ |

## 2. Zweck der Verarbeitung

CheckIn digitalisiert die Ausgangsliste eines Internats: Erfassung, wann ein Schüler das Gelände
verlässt und zurückkehrt, Überwachung der Aufsichtspflicht (Erkennung überfälliger Rückkehren),
Kommunikation mit Mitarbeitern/Erziehungsberechtigten-Vertretung (Mitarbeitern) bei Auffälligkeiten
sowie interne Auswertung (Statistiken) zur Betriebsorganisation.

**Rechtsgrundlage** (Art. 6 Abs. 1 DSGVO, ggf. i. V. m. Landesschulrecht):

- lit. b/f — Erfüllung der Aufsichtspflicht gegenüber minderjährigen Internatsschülern bzw.
  berechtigtes Interesse des Trägers an einer geordneten Ausgangsregelung.
- lit. c — Erfüllung rechtlicher Pflichten (Aufsichtspflicht, ggf. landesrechtliche
  Dokumentationspflichten).
- Für Mitarbeiter/Admin-Konten: lit. b — Durchführung des Beschäftigungsverhältnisses
  (Zugriffsrechte für ihre Aufgabe).

_[Konkrete Rechtsgrundlage und Einwilligungserfordernisse — insbesondere gegenüber
Erziehungsberechtigten minderjähriger Schüler — sind trägerspezifisch zu prüfen und hier
einzutragen.]_

## 3. Kategorien betroffener Personen

- Schüler (Internatsbewohner)
- Mitarbeiter (Aufsichts-/Betreuungspersonal)
- Administratoren (i. d. R. Verwaltungspersonal des Trägers)

## 4. Kategorien personenbezogener Daten

| Datenkategorie                | Beispiele (Prisma-Modell)                                                                    | Betroffene                  |
| ----------------------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| Stammdaten                    | Vor-/Nachname, E-Mail, Klasse, Zimmer, Wohnbereich (`User`)                                  | Schüler, Mitarbeiter, Admin |
| Zugangsdaten                  | Passwort-Hash (argon2id, nie Klartext), Login-Zeitpunkt (`User.passwordHash`, `lastLoginAt`) | alle                        |
| Aufenthaltsdaten              | Ausgangszeit, geplante/tatsächliche Rückkehr, Grund, **Zielort**, Bemerkung (`Absence`)      | Schüler                     |
| Verlängerungsdaten            | alte/neue Rückkehrzeit, Genehmigungsstatus (`Extension`)                                     | Schüler                     |
| Benachrichtigungen            | Titel/Nachricht, Lesestatus (`Notification`)                                                 | alle                        |
| Technische Metadaten für Push | Push-Endpoint + Schlüssel, User-Agent (`PushSubscription`)                                   | alle (opt-in)               |
| Protokolldaten                | Wer hat wann welche schreibende Aktion mit welchem Ergebnis ausgeführt (`AuditLog`)          | alle (als Akteur oder Ziel) |
| IP-Adresse                    | nur bei fehlgeschlagenem Login, zur Rate-Limitierung (`AuditLog.ip`)                         | alle                        |

**Besondere Kategorien (Art. 9 DSGVO):** keine vorgesehen. Der Freitext-Grund „Arzt" (fester
Enum-Wert, siehe `src/domain/absence-reason.ts`) und das freie Bemerkungsfeld könnten durch Nutzer
gleichwohl Gesundheitsbezüge enthalten — Nutzer sind darauf hinzuweisen, im Bemerkungsfeld keine
Gesundheitsdetails einzutragen, und die Felder sind entsprechend restriktiv sichtbar zu halten
(siehe Abschnitt 5).

## 5. Zielorte und Aufenthaltsdaten — Sichtbarkeit

Der Zielort (`Absence.destination`) und die übrigen Aufenthaltsdaten sind ausschließlich sichtbar
für:

- den betroffenen Schüler selbst (`requireRole("STUDENT")` + Filterung auf die eigene `userId` in
  jeder Abfrage, z. B. `src/app/(student)/page.tsx`),
- Mitarbeiter und Admins im Rahmen ihrer Aufsichtsfunktion (`VIEW_PRESENCE_LIST`,
  `VIEW_OTHER_HISTORY` in der Rechte-Matrix, `src/lib/authz.ts`).

Keine Statistik-, Export- oder Audit-Log-Ansicht zeigt den Zielort außerhalb dieser beiden Fälle
(verifiziert für `src/lib/stats-queries.ts`, `/api/v1/export/statistiken`,
`/admin/audit`, SSE-Snapshot `src/lib/admin-queries.ts`). Push-Benachrichtigungstexte
(`src/domain/notification-rules.ts`) enthalten bewusst keinen Zielort, auch wenn sie auf dem
gesperrten Bildschirm des eigenen Geräts sichtbar sein könnten.

## 6. Empfänger

- Keine Übermittlung an Dritte außerhalb des Internats-Trägers.
- Web Push (Abschnitt 8, PROMPT.md): Benachrichtigungs-**Text** wird zum Zustellen technisch über
  den Push-Dienst des jeweiligen Browser-/Betriebssystem-Anbieters geleitet (z. B. Mozilla/Google/
  Apple-Push-Infrastruktur), abhängig vom Endgerät des Nutzers. Dies ist eine notwendige
  Auftragsverarbeitung durch den Plattformanbieter, keine eigene Übermittlung durch den Träger.
  _[Bei produktivem Einsatz: AVV mit den jeweiligen Anbietern prüfen/dokumentieren.]_
- Kein SMTP-Versand außerhalb `ConsoleMailer` in dieser Entwicklungskonfiguration
  (`src/lib/mail/mailer.ts`) — bei produktivem Einsatz mit echtem SMTP-Anbieter wird dieser zum
  Auftragsverarbeiter (AVV erforderlich).

## 7. Übermittlung in Drittländer

Keine vorgesehen (Selbsthosting, siehe `docker-compose.yml`). Bei Nutzung eines Cloud-Anbieters für
Hosting oder Web-Push ist dessen Serverstandort/Angemessenheitsbeschluss zu prüfen.

## 8. Löschfristen und Löschkonzept

| Datensatz                               | Löschmechanismus                                                                                                                                                                        | Frist                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Benutzerkonto                           | Soft-Delete (`User.deletedAt`, Admin-Aktion) — Konto wird sofort deaktiviert und aus allen aktiven Listen entfernt, Datensatz bleibt für Audit-Nachweise erhalten                       | Admin-gesteuert, kein automatischer Hard-Delete für Benutzer in dieser Version |
| Abwesenheiten (abgeschlossen/storniert) | Hard-Delete-Job (`/api/v1/cron/cleanup`, `src/domain/retention.ts`)                                                                                                                     | Setting `dataRetentionMonths`, Default **12 Monate** ab `checkedOutAt`         |
| Aktive Abwesenheiten                    | nie automatisch gelöscht (per Definition nicht abgeschlossen)                                                                                                                           | —                                                                              |
| Verlängerungen (`Extension`)            | kaskadiert automatisch mit der zugehörigen Abwesenheit (`onDelete: Cascade`)                                                                                                            | wie Abwesenheit                                                                |
| Audit-Log                               | kein automatischer Hard-Delete in dieser Version — dient als Nachweis auch nach Löschung anderer Daten (`AuditLog.targetId` ist bewusst kein Fremdschlüssel, siehe `docs/decisions.md`) | _[trägerspezifische Aufbewahrungsfrist ergänzen]_                              |
| Push-Abonnements                        | gelöscht bei Abmelden durch den Nutzer oder automatisch bei ungültiger Zustellung (404/410)                                                                                             | sofort                                                                         |
| Passwort-Reset-Token                    | 1 Stunde Gültigkeit, danach funktional wertlos (kein separater Lösch-Job)                                                                                                               | _[periodisches Aufräumen alter Tokens optional ergänzen]_                      |

Der Hard-Delete-Job ist täglich vorgesehen (siehe README.md, Abschnitt „Cron-Tick") und idempotent
im Sinne von: mehrfaches Ausführen am selben Tag löscht nur die zu diesem Zeitpunkt tatsächlich
fälligen Datensätze, nie mehr.

## 9. Betroffenenrechte

| Recht                          | Umsetzung in CheckIn                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auskunft (Art. 15)             | Eigene-Daten-Export als JSON/CSV auf `/profil` (Schüler) bzw. den Benachrichtigungsseiten (Mitarbeiter/Admin) — `GET /api/v1/export/eigene-daten`                                       |
| Berichtigung (Art. 16)         | Schüler: keine Selbstbearbeitung der Stammdaten vorgesehen — Meldung an Mitarbeiter/Admin, die Korrekturen mit Audit-Log-Nachweis vornehmen (`/staff/schueler/[id]`, `/admin/schueler`) |
| Löschung (Art. 17)             | Admin-gesteuerter Soft-Delete des Kontos; automatischer Hard-Delete der Abwesenheitsdaten nach Ablauf der Aufbewahrungsfrist (Abschnitt 8)                                              |
| Einschränkung (Art. 18)        | Deaktivieren eines Kontos (`Aktivieren`/`Deaktivieren` in der Benutzerverwaltung) ohne Datenverlust                                                                                     |
| Datenübertragbarkeit (Art. 20) | JSON-Export ist maschinenlesbar strukturiert (siehe Abschnitt „Auskunft")                                                                                                               |
| Widerspruch (Art. 21)          | _[trägerspezifischer Prozess außerhalb der Software zu dokumentieren]_                                                                                                                  |

## 10. Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

- **Verschlüsselung im Transit:** HTTPS wird vom Betreiber vorausgesetzt; `Strict-Transport-Security`
  erzwingt es für wiederkehrende Besucher (`next.config.ts`).
- **Passwort-Sicherheit:** argon2id-Hashing (`@node-rs/argon2`, `src/lib/password.ts`), nie
  Klartext in DB oder Logs.
- **Zugriffskontrolle:** rollenbasiert auf drei Ebenen — Middleware (`src/auth.config.ts`),
  zentrale `requireRole()`/`requireApiRole()`-Prüfung als erste Zeile jeder Server Action/jedes
  Route Handlers (`src/lib/authz.ts`), sowie datensatzscharfe Filterung nach `userId` in jeder
  Datenbankabfrage.
- **Security-Header:** Content-Security-Policy, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (`next.config.ts`).
- **Protokollierung:** vollständiges Audit-Log für alle sicherheits-/verwaltungsrelevanten
  schreibenden Aktionen (Korrekturen, Stornierungen, Benutzerverwaltung, Einstellungen,
  Datenexporte, automatisierte Löschungen) mit Vorher-/Nachher-Werten bei Korrekturen — siehe
  `docs/decisions.md` für die bewusste Abgrenzung gegenüber rein persönlichen UI-Zuständen
  (z. B. „Benachrichtigung gelesen").
- **Rate-Limiting:** 5 fehlgeschlagene Login-Versuche / 15 Minuten pro E-Mail **und** IP
  (`src/domain/rate-limit.ts`).
- **Session-Sicherheit:** JWT-Session mit 8 h absoluter und 60 min Idle-Timeout-Grenze
  (`src/domain/session.ts`).
- **Datenminimierung:** Logging (`pino`, `src/lib/logger.ts`) enthält ausschließlich die
  technische User-ID, keine Namen/E-Mails/Zielorte; Push-Benachrichtigungstexte enthalten keine
  Zielorte (Abschnitt 5).
- **Löschkonzept:** siehe Abschnitt 8.

## 11. Auftragsverarbeiter

Keine in der Standardkonfiguration (Selbsthosting: eigene PostgreSQL-Instanz, `ConsoleMailer`
statt externem E-Mail-Versand). _[Bei Erweiterung um echten SMTP-Versand, Hosting bei einem
Cloud-Anbieter oder externem Push-Dienst-Betrieb: jeweils AVV nach Art. 28 DSGVO abschließen und
hier eintragen.]_
