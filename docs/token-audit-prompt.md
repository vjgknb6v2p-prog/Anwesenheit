# Token-, Kontext- und Kosten-Audit für Claude Code (projektunabhängig)

Verwendung: Den Abschnitt „PROMPT“ in eine frische Claude-Code-Session im Zielprojekt kopieren.
Vorher optional `/context` und `/cost` ausführen und die Ausgabe mit einfügen. Der Audit ist
**read-only** und ändert nichts, bis du die Maßnahmen freigibst.

---

## PROMPT

Du bist Token-Effizienz-Auditor für Claude Code. Analysiere dieses Projekt und meine Claude-Code-
Konfiguration auf Token-Verbrauch, Kontextfenster-Auslastung und Kosten. Ziel: den Verbrauch pro
erledigter Aufgabe um mindestens 50 % senken, ohne Ergebnisqualität zu verlieren.

### Regeln für den Audit

- **Nur lesen, nichts ändern.** Keine Dateien editieren, keine Commits. Ergebnis ist ein Bericht
  plus ein Maßnahmenplan, den ich freigebe.
- **Messen statt raten.** Jede Aussage braucht eine Zahl (Tokens, Zeichen, Zeilen, Dateigröße) oder
  ein konkretes Beispiel. Tokens schätzen als Zeichen ÷ 3,5 (Code/Deutsch) bzw. ÷ 4 (Englisch) und
  die Schätzung als solche kennzeichnen. Wenn eine Zahl nicht ermittelbar ist, schreibe
  „nicht messbar“ statt zu raten.
- **Selbst sparsam arbeiten.** Nutze Glob/Grep statt ganze Dateien zu lesen, `wc -c`/`wc -l`/`du`
  statt Inhalten, lies große Dateien nur mit `offset`/`limit`. Delegiere breite Suchen an einen
  Explore-Subagent, damit Zwischenergebnisse nicht in diesen Kontext laufen.
- **Keine Geheimnisse ausgeben.** `.env`, Schlüssel, Tokens nie anzeigen, nur Größe/Existenz melden.
- Wenn du ein Claude-Code-Feature nicht sicher kennst, prüfe es mit `/help` bzw. der offiziellen
  Doku (claude-code-guide-Agent), statt es zu behaupten.

### Phase 0 – Ist-Zustand erfassen

1. Falls vorhanden, werte meine eingefügte `/context`- und `/cost`-Ausgabe aus. Fehlt sie, bitte
   mich, `/context` auszuführen, und fahre mit dem Rest fort.
2. Stelle fest: Projektgröße (Dateianzahl, LOC je Sprache, größte 20 Dateien, Verzeichnisse mit den
   meisten Dateien), Monorepo ja/nein, Package-Manager, Build-/Test-Tools.
3. Inventarisiere alles, was **bei jedem Turn oder jedem Sessionstart automatisch** im Kontext landet
   (Fixkosten), jeweils mit Größe in Zeichen und geschätzten Tokens:
   - Systemprompt und Tool-Definitionen (aus `/context`)
   - `CLAUDE.md` auf allen Ebenen: `~/.claude/CLAUDE.md`, Projekt-Root, Unterverzeichnisse,
     `CLAUDE.local.md`, per `@import` eingebundene Dateien (rekursiv auflösen!)
   - Memory-/Auto-Memory-Dateien
   - MCP-Server: Anzahl, Anzahl Tools je Server, Größe der Tool-Beschreibungen und Schemas
   - Skills, Slash-Commands, Subagent-Definitionen: Größe der Beschreibungen, die immer geladen
     werden (Frontmatter), und Größe der Bodies, die bei Aufruf geladen werden
   - Hooks (`SessionStart`, `UserPromptSubmit` usw.), die Text in den Kontext injizieren
   - Plugins und deren mitgebrachte Skills/MCP-Server
4. Lies `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude/settings.json`:
   Modell-Defaults, Permissions (allow/deny), Env-Variablen, Hooks, Auto-Compact-Einstellungen.

### Phase 1 – Audit-Kategorien (jede einzeln bewerten: Rot / Gelb / Grün + Zahl)

**A. Dauerhafter Kontext (Fixkosten pro Turn)**
- `CLAUDE.md` insgesamt > ca. 200 Zeilen oder > ca. 2.500 Tokens? Enthält sie Inhalte, die nur selten
  gebraucht werden (Architekturprosa, Dateibäume, Changelogs, Tabellen, Beispiele)? Redundanz mit
  README/Docs? Veraltete Angaben? Dateibaum, den der Agent per Glob ohnehin findet?
- Was gehört stattdessen in verschachtelte `CLAUDE.md` in Unterordnern (lädt nur bei Arbeit dort),
  in Skills (laden nur bei Bedarf) oder in `docs/` (nur bei Bedarf lesen)?
- Zu viele MCP-Server/Tools? Jeder Server kostet mit seinen Tool-Schemas bei jedem Turn Tokens,
  auch ungenutzt. Liste Server mit Tool-Anzahl und Token-Schätzung, markiere nie genutzte.
- Skills/Commands/Agents mit überlangen `description`-Feldern (werden immer geladen) oder
  Überschneidungen untereinander.
- Hooks, die große Ausgaben injizieren (z. B. `git status`, Dateilisten bei jedem Prompt).

**B. Dateizugriffe und Suchverhalten**
- Fehlende Ausschlüsse: Gibt es `deny`-Regeln für `Read` auf `node_modules`, `dist`, `.next`,
  `build`, `coverage`, `*.lock`, Lockfiles, Minified/Generated Code, Binär-/Medien-/Daten-Dumps,
  große Fixtures, Logs, `.env*`? Wird `.gitignore` sauber gepflegt (Suchwerkzeuge respektieren es)?
- Riesige Einzeldateien (> 500 Zeilen / > 20 KB), die komplett gelesen werden könnten: aufteilen
  oder Lesezugriff per Offset/Limit erzwingen.
- Generierter Code oder Vendor-Code im Repo, der Suchergebnisse verrauscht (Grep-Treffer in
  `dist/`, Lockfiles, Snapshots).
- Schlechte Dateinamen/Struktur, die Suche ineffizient machen (viele gleichnamige `index.ts`,
  unklare Ordner), fehlende Einstiegsdoku („wo liegt was“) in wenigen Zeilen.

**C. Werkzeug-Ausgaben**
- Welche Befehle erzeugen lange Ausgaben (Test-Runner, Build, Linter, `git log`, `git diff`,
  Paketmanager, Docker, Migrationen)? Ermittle die typische Ausgabelänge, indem du sie mit
  `| wc -c` oder `| tail` ausführst, nicht im Klartext.
- Existieren knappe Varianten (`--silent`, `--reporter=dot`, `--quiet`, `--stat`, `--oneline`,
  `-q`, `--no-progress`, `CI=1`), die in `CLAUDE.md` als Standard festgelegt werden können?
- Begrenzung der Bash-Ausgabe über Umgebungsvariablen/Settings prüfen (z. B. maximale
  Ausgabelänge); nur nennen, was in dieser Version tatsächlich existiert.
- Skripte, die Ausgaben auf Fehlerzeilen filtern (`tail -n 40`, `grep -E "error|fail"`).

**D. Sitzungsführung**
- Anzeichen für zu lange Sessions: Kontextauslastung hoch, mehrere unzusammenhängende Aufgaben
  in einer Session, häufiges Auto-Compact. Jede Wiederholung des gesamten Verlaufs kostet bei
  jedem Turn erneut (auch bei Prompt-Caching: Cache-Reads sind billiger, aber nicht gratis, und
  ein Cache-Miss nach Pause zahlt den ganzen Verlauf neu).
- Gibt es Gewohnheiten/Regeln für `/clear` zwischen Aufgaben, `/compact` mit Fokus-Hinweis
  an sinnvollen Stellen, `/resume` statt Neuerklärung, Aufgaben in kleine abgeschlossene Einheiten?
- Wird Wissen, das neu erklärt werden muss, in Dateien persistiert (Plan-/Notizdatei, `docs/`),
  damit eine neue Session nicht den alten Verlauf braucht?

**E. Modell- und Denkaufwand**
- Wird für einfache Aufgaben (Umbenennen, Formatieren, Suche, Boilerplate, Commit-Texte) das
  teuerste Modell genutzt? Empfiehl Modellwahl pro Aufgabentyp (kleines/schnelles Modell für
  mechanische Arbeit, großes für Architektur/Debugging), inklusive Subagents mit eigenem `model`.
- Wird erweitertes Denken (Thinking-Budget, Effort-Stufe) dauerhaft hoch gehalten, obwohl nicht nötig?
  Empfiehl niedriger Standard, gezielt hoch für schwierige Probleme.
- Fast-Modus/Premium-Optionen nur gezielt.

**F. Subagents und Parallelität**
- Subagents sind sinnvoll für breite Suche/Recherche (Zwischenergebnisse bleiben aus dem
  Hauptkontext), aber jeder startet kalt und bringt Systemprompt + eigenen Kontext mit. Prüfe:
  Werden sie für Triviales gestartet (Verschwendung) oder fehlen sie bei großen Suchaufgaben
  (Hauptkontext läuft voll)? Haben sie schlanke Tool-Listen und kurze Rückgabeformate?
- Werden Agent-Teams/parallele Läufe ohne Not verwendet (Verbrauch skaliert mit der Anzahl)?

**G. Prompt- und Arbeitsweise**
- Vage Aufträge („schau dir das Projekt an“, „verbessere alles“) führen zu breitem Lesen. Empfiehl
  Aufgaben mit Dateipfad, Funktionsname, erwartetem Ergebnis und Abnahmekriterium.
- Dateien per `@pfad` gezielt referenzieren statt suchen lassen; Fehlermeldungen kurz und gefiltert
  einfügen (nur relevante Stacktrace-Zeilen), keine kompletten Logs.
- Wiederholte Korrekturschleifen („nochmal“, „nein anders“): Ursache klären (fehlende Regel in
  CLAUDE.md, fehlender Test, unklare Vorgabe) und beheben.
- Redundante Verifikation: wiederholtes Neu-Lesen eben geschriebener Dateien, doppelte Testläufe,
  Vollbuild statt gezieltem Typecheck/Einzeltest.
- Antwortlänge: unnötig lange Erklärungen, Wiederholung von Diffs, Zusammenfassungen von Dingen,
  die ohnehin im Diff stehen. Empfiehl knappe Ausgabeformate in `CLAUDE.md`.

**H. Tests, Build, Tooling**
- Gibt es schnelle, gezielte Befehle (einzelne Testdatei, geänderte Dateien, `typecheck` ohne
  Build, `lint --cache`)? Sind sie in `CLAUDE.md` dokumentiert, damit der Agent nicht den
  Vollbuild startet?
- Flaky/langsame Tests, die zu Wiederholungsläufen und langen Ausgaben führen.
- Watch-Modi oder Dev-Server, deren Dauerlog in den Kontext läuft (stattdessen im Hintergrund,
  Ausgabe in Datei, bei Bedarf `tail`).

**I. Kosten- und Limit-Kontrolle**
- Welche Limits gelten für meinen Plan (Nutzungsfenster, Wochenlimits, API-Budget)? Falls
  unbekannt, bitte mich um die Info; nichts erfinden.
- Empfiehl Messroutine: `/cost`/`/context` am Sessionende, Kosten pro Aufgabentyp notieren,
  Statuszeile mit Kontextanteil, optional Auswertung der Session-Transkripte unter
  `~/.claude/projects/` (Tokens pro Turn, größte Tool-Ergebnisse) zur Identifikation der Top-Verbraucher.
- Sicherheitsnetze: Budget-Obergrenzen, Warnung bei hoher Kontextauslastung.

### Phase 2 – Top-Verbraucher ermitteln

Wenn Transkripte erreichbar sind (`~/.claude/projects/<projekt>/*.jsonl`), werte sie mit einem
kurzen Skript im Scratchpad aus (nicht den Inhalt ausgeben, nur Statistiken):
- Tokens je Session und je Turn, Anteil Input/Output/Cache-Read/Cache-Write
- die 10 größten Tool-Ergebnisse (Tool, Befehl/Pfad, Größe)
- am häufigsten gelesene Dateien und Wiederholungs-Lesezugriffe derselben Datei
- Sessions mit Auto-Compact und der Zeitpunkt davor
Wenn nicht erreichbar: sag es und liefere stattdessen den Befehl, den ich ausführen kann.

### Phase 3 – Bericht (Ausgabeformat)

Gib genau diese Struktur aus, knapp und ohne Füllsätze:

1. **Kurzfazit** (max. 5 Zeilen): Gesamturteil, geschätzte Fixkosten pro Turn in Tokens, größte
   drei Hebel, erwartete Einsparung in %.
2. **Ist-Zustand-Tabelle**: Komponente | Größe (Zeichen) | ~Tokens | Ladezeitpunkt (immer / bei Bedarf)
   | Bewertung (Rot/Gelb/Grün).
3. **Befunde je Kategorie A–I**: je Befund eine Zeile `[Schwere] Beleg (Zahl/Pfad) → Folge`.
4. **Maßnahmenplan**, nach Verhältnis Einsparung/Aufwand sortiert, je Maßnahme:
   Nr. | Maßnahme | konkrete Änderung (Datei, Zeilen oder Wortlaut) | geschätzte Einsparung
   (Tokens/Turn oder %/Session) | Aufwand (min) | Risiko für Qualität.
   Gruppiere in „Sofort (< 10 Min)“, „Heute“, „Strukturell“.
5. **Fertige Artefakte** (als Entwurf im Bericht, nicht auf die Platte schreiben):
   - gekürzte `CLAUDE.md` (Ziel: Regeln und Befehle, keine Prosa, < 150 Zeilen)
   - Vorschlag `permissions.deny`/Ausschlüsse für `.claude/settings.json`
   - Liste zu deaktivierender MCP-Server/Skills/Plugins
   - 5–10 Zeilen „Sparsame Arbeitsweise“ für `CLAUDE.md` (siehe Vorlage unten)
6. **Verifikationsplan**: Wie messe ich nach der Umsetzung den Effekt (gleiche Referenzaufgabe,
   vorher/nachher `/context` und `/cost`)?
7. **Offene Fragen** an mich, falls Zahlen oder Entscheidungen fehlen.

Stoppe danach und warte auf meine Freigabe einzelner Maßnahmen.

---

## Vorlage: Sparsame Arbeitsweise (für CLAUDE.md)

```markdown
## Token-sparsame Arbeitsweise
- Erst gezielt suchen (Glob/Grep), dann nur die relevanten Zeilen lesen (offset/limit). Keine
  ganzen Dateien lesen, wenn eine Funktion reicht. Nichts erneut lesen, was gerade geschrieben wurde.
- Befehle mit knapper Ausgabe ausführen (Reporter "dot"/silent, `--stat`, `| tail -n 40`).
  Lange Logs in Datei umleiten und nur Fehlerzeilen zeigen.
- Gezielt prüfen: erst Einzeltest/Typecheck der geänderten Dateien, Vollbuild nur am Ende.
- Breite Recherche an Explore-Subagent delegieren, nur das Ergebnis zurückgeben lassen.
- Antworten kurz: kein Wiederholen des Diffs, keine Zusammenfassung von Offensichtlichem.
- Nicht lesen: node_modules, dist, .next, build, coverage, Lockfiles, generierter Code.
- Bei Aufgabenwechsel Session beenden (/clear) und Stand in docs/ oder Plan-Datei festhalten.
```

---

## Cheat-Sheet: Hebel nach Wirkung

| Hebel | Typische Wirkung | Aufwand |
| --- | --- | --- |
| Ungenutzte MCP-Server/Plugins/Skills abschalten | senkt Fixkosten jedes Turns, oft mehrere tausend Tokens | 5 Min |
| `CLAUDE.md` auf Regeln und Befehle kürzen, Rest in Skills/`docs/`/Unterordner | senkt Fixkosten jedes Turns | 30 Min |
| `/clear` pro Aufgabe statt Mammut-Session | größter Einzelhebel bei langen Sessions | 0 Min |
| Deny-Regeln für `node_modules`, Build-Output, Lockfiles | verhindert Riesen-Lesezugriffe | 10 Min |
| Kleineres Modell für mechanische Aufgaben, Thinking niedrig als Standard | senkt Kosten pro Token und Denkaufwand | 5 Min |
| Knappe Test-/Build-Ausgaben festlegen | verhindert Tausende Tokens pro Lauf | 15 Min |
| Subagents für breite Suchen | hält Hauptkontext klein | 0 Min |
| Konkrete Aufträge mit Pfad und Abnahmekriterium | weniger Suchen, weniger Korrekturschleifen | 0 Min |
| Plan-/Notizdatei statt langem Verlauf | Session-Neustart ohne Kontextverlust | 10 Min |
| `/compact` mit Fokus-Hinweis vor dem Limit, nicht danach | kontrollierter Kontextverlust statt Auto-Compact | 0 Min |

Hinweis: Konkrete Einstellungsnamen, Env-Variablen und Slash-Commands ändern sich zwischen
Claude-Code-Versionen. Der Auditor soll sie vor der Empfehlung mit `/help` oder der Doku abgleichen.
