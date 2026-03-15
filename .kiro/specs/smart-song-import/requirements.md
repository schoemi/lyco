# Requirements Document – Smart Song Import

## Einleitung

Dieses Dokument beschreibt die Anforderungen für den „Smart Song Import" im Song Text Trainer. Aktuell müssen Nutzer Songs manuell Strophe für Strophe und Zeile für Zeile über ein Formular eingeben. Das Smart-Import-Feature bietet zwei schnellere Wege: (1) Songtext als Text einfügen/eintippen mit automatischer Erkennung der Strophen-Struktur, und (2) PDF-Upload mit LLM-basierter Extraktion von Titel, Künstler und strukturiertem Songtext.

## Glossar

- **Import_Page**: Die überarbeitete Next.js-Seite unter `/songs/import`, die Tab-basiert zwischen manuellem Import, Text-Import und PDF-Import umschaltet
- **Text_Editor**: Ein editierbares Textfeld mit Syntax-Highlighting für `[Section Name]`-Marker, in das der Nutzer Songtexte einfügen oder eintippen kann
- **Songtext_Parser**: Ein client-seitiger Parser, der Songtext im Standardformat (mit `[Section]`-Markern) in die `ImportSongInput`-Struktur umwandelt
- **PDF_Uploader**: Eine Komponente zum Hochladen einer PDF-Datei, die den Inhalt an die API zur LLM-Extraktion sendet
- **Parse_PDF_API**: Ein neuer API-Endpunkt `POST /api/songs/parse-pdf`, der PDF-Text via LLM in strukturierte Song-Daten umwandelt
- **Noise_Filter**: Logik im Songtext_Parser, die typische Störzeilen von Lyrics-Websites herausfiltert (z.B. „You might also like", Künstler-Empfehlungen)
- **ImportSongInput**: Die bestehende TypeScript-Schnittstelle für den Song-Import mit Titel, Künstler, Strophen und Zeilen

## Anforderungen

### Requirement 1: Tab-basierte Import-Seite

**User Story:** Als Nutzer möchte ich zwischen verschiedenen Import-Methoden wählen können, damit ich den für mich schnellsten Weg nutzen kann.

#### Acceptance Criteria

1. WHEN der Nutzer die Import-Seite öffnet, THE Import_Page SHALL drei Tabs anzeigen: „Manuell", „Text einfügen", „PDF Upload"
2. WHEN der Nutzer einen Tab auswählt, THE Import_Page SHALL den entsprechenden Import-Modus anzeigen und die anderen ausblenden
3. WHEN die Import_Page geladen wird, THE Import_Page SHALL den Tab „Text einfügen" als Standard vorauswählen
4. THE Import_Page SHALL die Tab-Leiste als `role="tablist"` mit `aria-label="Import-Methode"` implementieren

### Requirement 2: Text-Import mit Songtext_Parser

**User Story:** Als Nutzer möchte ich einen Songtext als Freitext einfügen können, damit ich Songs schnell aus Lyrics-Websites oder eigenen Notizen importieren kann.

#### Acceptance Criteria

1. WHEN der Tab „Text einfügen" aktiv ist, THE Import_Page SHALL ein Text_Editor-Feld, ein Titel-Eingabefeld und ein Künstler-Eingabefeld anzeigen
2. WHEN der Nutzer Text in den Text_Editor eingibt, THE Text_Editor SHALL Zeilen im Format `[Section Name]` farblich hervorheben (Syntax-Highlighting)
3. WHEN der Nutzer den Import-Button betätigt, THE Songtext_Parser SHALL den Text in `ImportSongInput`-Struktur umwandeln: Zeilen zwischen `[Section]`-Markern werden als Strophen gruppiert, der Marker-Text wird zum Strophen-Namen
4. WHEN der Text keine `[Section]`-Marker enthält, THE Songtext_Parser SHALL den gesamten Text als eine einzelne Strophe mit dem Namen „Verse" behandeln
5. WHEN der Text Leerzeilen zwischen Textblöcken enthält (ohne `[Section]`-Marker), THE Songtext_Parser SHALL jeden durch Leerzeilen getrennten Block als eigene Strophe behandeln
6. WHEN der Songtext_Parser Noise-Zeilen erkennt (z.B. „You might also like", Künstler-Empfehlungen), THE Noise_Filter SHALL diese Zeilen aus dem Ergebnis entfernen
7. WHEN der Nutzer den Import-Button betätigt und der Text leer ist, THE Import_Page SHALL eine Fehlermeldung anzeigen und den Import verhindern

### Requirement 3: PDF-Import mit LLM-Extraktion

**User Story:** Als Nutzer möchte ich eine PDF-Datei mit einem Songtext hochladen können, damit ich Songs aus Notenblättern oder Liederbüchern importieren kann.

#### Acceptance Criteria

1. WHEN der Tab „PDF Upload" aktiv ist, THE Import_Page SHALL eine Drag-and-Drop-Zone und einen Datei-Auswahl-Button für PDF-Dateien anzeigen
2. WHEN der Nutzer eine PDF-Datei hochlädt, THE PDF_Uploader SHALL die Datei an `POST /api/songs/parse-pdf` senden
3. WHEN die Parse_PDF_API eine PDF empfängt, THE Parse_PDF_API SHALL den Text aus der PDF extrahieren (via `pdf-parse` Bibliothek)
4. WHEN der PDF-Text extrahiert wurde, THE Parse_PDF_API SHALL den Text an die OpenAI API senden mit einem Prompt, der Titel, Künstler und strukturierten Songtext (Strophen mit Namen und Zeilen) extrahiert
5. WHEN die LLM-Antwort empfangen wurde, THE Parse_PDF_API SHALL die Antwort als `ImportSongInput`-kompatibles JSON validieren und zurückgeben
6. WHEN die PDF-Extraktion erfolgreich ist, THE Import_Page SHALL die extrahierten Daten im Text_Editor anzeigen, damit der Nutzer sie vor dem endgültigen Import überprüfen und bearbeiten kann
7. WHEN die PDF-Datei keinen extrahierbaren Text enthält, THE Parse_PDF_API SHALL einen Fehler mit Status 422 und einer verständlichen Fehlermeldung zurückgeben
8. WHEN die OpenAI API nicht erreichbar ist oder einen Fehler zurückgibt, THE Parse_PDF_API SHALL einen Fehler mit Status 502 und einer verständlichen Fehlermeldung zurückgeben
9. WHEN die hochgeladene Datei keine PDF ist oder größer als 5MB, THE Parse_PDF_API SHALL einen Fehler mit Status 400 zurückgeben
10. THE Parse_PDF_API SHALL keine Akkord- oder Gitarren-Annotationen extrahieren – nur Lyrics, Strophen-Struktur, Titel und Künstler

### Requirement 4: Songtext_Parser – Detailverhalten

**User Story:** Als Nutzer möchte ich, dass der Parser meinen eingefügten Text korrekt in Strophen und Zeilen aufteilt, damit ich den Song nicht manuell nachbearbeiten muss.

#### Acceptance Criteria

1. WHEN der Songtext_Parser eine Zeile im Format `[Text]` erkennt, THE Songtext_Parser SHALL diese als Strophen-Marker interpretieren und den Text zwischen den Klammern als Strophen-Namen verwenden
2. WHEN mehrere aufeinanderfolgende Nicht-Leer-Zeilen nach einem `[Section]`-Marker folgen, THE Songtext_Parser SHALL alle diese Zeilen als Zeilen der aktuellen Strophe behandeln
3. WHEN der Songtext_Parser den Text verarbeitet, THE Songtext_Parser SHALL führende und nachfolgende Leerzeichen pro Zeile entfernen (trimmen)
4. WHEN der Songtext_Parser den Text verarbeitet, THE Songtext_Parser SHALL reine Leerzeilen (nur Whitespace) als Strophen-Trenner behandeln
5. WHEN eine Strophe nach dem Parsen keine Zeilen enthält (z.B. `[Instrumental Bridge]` ohne Folgezeilen), THE Songtext_Parser SHALL diese Strophe trotzdem mit leerem Zeilen-Array erzeugen
6. WHEN der Songtext_Parser den Text verarbeitet, THE Songtext_Parser SHALL die Strophen in der Reihenfolge ihres Auftretens im Text nummerieren (orderIndex)

### Requirement 5: Text_Editor mit Syntax-Highlighting

**User Story:** Als Nutzer möchte ich im Textfeld visuelles Feedback zu den erkannten Strophen-Markern sehen, damit ich die Struktur meines Songtexts überprüfen kann.

#### Acceptance Criteria

1. THE Text_Editor SHALL ein editierbares Textfeld sein, das mehrzeiligen Text unterstützt
2. WHEN der Text `[Section Name]`-Marker enthält, THE Text_Editor SHALL diese Zeilen farblich hervorheben (z.B. fetter Text oder andere Hintergrundfarbe)
3. THE Text_Editor SHALL ohne schwere externe Abhängigkeiten (kein CodeMirror, kein Monaco) implementiert werden – ein `contenteditable`-Div oder eine leichtgewichtige Lösung ist bevorzugt
4. THE Text_Editor SHALL Einfügen aus der Zwischenablage (Paste) unterstützen und dabei die Textformatierung entfernen (nur Plain-Text übernehmen)

### Requirement 6: Fehlerbehandlung und Validierung

**User Story:** Als Nutzer möchte ich klare Fehlermeldungen erhalten, wenn beim Import etwas schiefgeht, damit ich das Problem beheben kann.

#### Acceptance Criteria

1. WHEN der Nutzer den Import ohne Titel startet, THE Import_Page SHALL eine Fehlermeldung „Titel ist erforderlich" anzeigen
2. WHEN der Songtext_Parser keine gültigen Zeilen im Text findet, THE Import_Page SHALL eine Fehlermeldung „Mindestens eine Zeile mit Text erforderlich" anzeigen
3. WHEN die PDF-Verarbeitung fehlschlägt, THE Import_Page SHALL die Fehlermeldung der API anzeigen
4. WHEN der Import erfolgreich ist, THE Import_Page SHALL den Nutzer zur Song-Detailseite weiterleiten

### Requirement 7: Barrierefreiheit

**User Story:** Als Nutzer mit Einschränkungen möchte ich die Import-Funktionen mit assistiven Technologien bedienen können.

#### Acceptance Criteria

1. THE Import_Page SHALL die Tab-Navigation als `role="tablist"` mit korrekten `role="tab"` und `role="tabpanel"` Attributen implementieren
2. THE Text_Editor SHALL ein `aria-label="Songtext eingeben"` Attribut besitzen
3. THE PDF_Uploader SHALL per Tastatur bedienbar sein und den Upload-Status via `aria-live="polite"` kommunizieren
4. ALL Fehlermeldungen SHALL via `role="alert"` an Screenreader kommuniziert werden
