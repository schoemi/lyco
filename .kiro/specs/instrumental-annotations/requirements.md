# Requirements Document

## Einführung

Dieses Feature führt zwei neue Konzepte ein, um die Textanzeige beim Scrollen zu verbessern und visuelle Orientierung für Pausen, Instrumentalteile und ähnliche nicht-gesungene Abschnitte zu bieten:

1. **Instrumental-Sektionen**: Ganze Strophen können als "Instrumental" markiert werden. Sie werden mit besonderem Styling angezeigt, aber aus allen Lerninteraktionen ausgeschlossen.
2. **Kommentar-Zeilen (Annotation Lines)**: Einzelne Zeilen innerhalb normaler Strophen können als "Kommentar" markiert werden. Auch sie erhalten besonderes Styling und werden aus allen Lerninteraktionen ausgeschlossen.

Beide dienen als visuelle Orientierungsmarker während der Textanzeige (z.B. "[Instrumental]", "[Bridge - 8 Takte]", "[Pause]"), müssen aber aus allen Lernmodi ausgeschlossen werden.

## Glossar

- **Strophe**: Eine Strophe (Verse, Chorus, Bridge etc.) eines Songs, bestehend aus Zeilen
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe
- **Instrumental-Sektion**: Eine Strophe, die als rein instrumental markiert ist und keinen lernbaren Text enthält
- **Kommentar-Zeile**: Eine Zeile innerhalb einer normalen Strophe, die als Annotation/Kommentar markiert ist und keinen lernbaren Text enthält
- **Lernmodus**: Jede interaktive Übungsform (Lückentext, Karaoke, Zeile-für-Zeile, Rückwärts, Quiz, Vocal Trainer, Spaced Repetition)
- **StropheService**: Der Backend-Service für CRUD-Operationen auf Strophen
- **ZeileService**: Der Backend-Service für CRUD-Operationen auf Zeilen
- **StropheCard**: Die UI-Komponente zur Anzeige einer Strophe in der Song-Detailansicht
- **StrophenAnzeige**: Die UI-Komponente zur Anzeige von Strophen im Karaoke-Modus
- **FlattenLines**: Die Hilfsfunktion, die Strophen und Zeilen in eine flache Liste für Karaoke/Stage-Modus umwandelt
- **QuizGenerator**: Die Funktion, die Quiz-Fragen aus Song-Daten generiert
- **StrophenAuswahlDialog**: Der Dialog zur Auswahl aktiver Strophen in Lernmodi

## Requirements

### Requirement 1: Strophe als Instrumental markieren

**User Story:** Als Nutzer möchte ich eine Strophe als "Instrumental" markieren können, damit ich instrumentale Abschnitte im Songtext visuell erkennen kann.

#### Acceptance Criteria

1. WHEN der Nutzer eine Strophe als Instrumental markiert, THE StropheService SHALL das Feld `istInstrumental` der Strophe auf `true` setzen
2. WHEN der Nutzer die Instrumental-Markierung einer Strophe entfernt, THE StropheService SHALL das Feld `istInstrumental` der Strophe auf `false` setzen
3. THE Strophe SHALL ein Boolean-Feld `istInstrumental` besitzen, das standardmäßig `false` ist
4. WHEN eine Strophe als Instrumental markiert ist, THE StropheCard SHALL die Strophe mit einem visuell unterscheidbaren Styling anzeigen (z.B. kursive Schrift, gedämpfte Farbe, Instrumental-Icon)
5. WHEN eine Strophe als Instrumental markiert ist, THE StropheCard SHALL den Strophen-Namen mit einem "[Instrumental]"-Indikator ergänzen

### Requirement 2: Zeile als Kommentar markieren

**User Story:** Als Nutzer möchte ich einzelne Zeilen als "Kommentar" markieren können, damit ich Annotationen wie "[Pause]" oder "[Bridge - 8 Takte]" im Songtext einfügen kann.

#### Acceptance Criteria

1. WHEN der Nutzer eine Zeile als Kommentar markiert, THE ZeileService SHALL das Feld `istKommentar` der Zeile auf `true` setzen
2. WHEN der Nutzer die Kommentar-Markierung einer Zeile entfernt, THE ZeileService SHALL das Feld `istKommentar` der Zeile auf `false` setzen
3. THE Zeile SHALL ein Boolean-Feld `istKommentar` besitzen, das standardmäßig `false` ist
4. WHEN eine Zeile als Kommentar markiert ist, THE StropheCard SHALL die Zeile mit einem visuell unterscheidbaren Styling anzeigen (z.B. kursive Schrift, gedämpfte Farbe)
5. WHEN eine Zeile als Kommentar markiert ist, THE StropheCard SHALL die Zeile von normalen Textzeilen visuell abgrenzen

### Requirement 3: Instrumental-Sektionen aus Lernmodi ausschließen

**User Story:** Als Nutzer möchte ich, dass Instrumental-Sektionen automatisch aus allen Lerninteraktionen ausgeschlossen werden, damit ich nur tatsächlich gesungenen Text übe.

#### Acceptance Criteria

1. WHEN ein Lernmodus Strophen für eine Übung sammelt, THE QuizGenerator SHALL Strophen mit `istInstrumental === true` herausfiltern
2. WHEN der Karaoke-Modus Zeilen flacht, THE FlattenLines SHALL alle Zeilen von Instrumental-Strophen überspringen
3. WHEN der StrophenAuswahlDialog Strophen zur Auswahl anzeigt, THE StrophenAuswahlDialog SHALL Instrumental-Strophen aus der Auswahlliste ausschließen
4. WHEN der Lückentext-Modus Lücken generiert, THE Lückentext-Generator SHALL Strophen mit `istInstrumental === true` überspringen
5. WHEN der Spaced-Repetition-Modus Strophen einschreibt, THE Spaced-Repetition-Service SHALL Instrumental-Strophen von der Einschreibung ausschließen
6. WHEN der Zeile-für-Zeile-Modus Zeilen durchläuft, THE Zeile-für-Zeile-Modus SHALL Zeilen von Instrumental-Strophen überspringen
7. WHEN der Rückwärts-Modus Zeilen durchläuft, THE Rückwärts-Modus SHALL Zeilen von Instrumental-Strophen überspringen

### Requirement 4: Kommentar-Zeilen aus Lernmodi ausschließen

**User Story:** Als Nutzer möchte ich, dass Kommentar-Zeilen automatisch aus allen Lerninteraktionen ausgeschlossen werden, damit ich nur tatsächlich gesungenen Text übe.

#### Acceptance Criteria

1. WHEN ein Lernmodus Zeilen für eine Übung sammelt, THE QuizGenerator SHALL Zeilen mit `istKommentar === true` herausfiltern
2. WHEN der Karaoke-Modus Zeilen flacht, THE FlattenLines SHALL Kommentar-Zeilen überspringen
3. WHEN der Lückentext-Modus Lücken generiert, THE Lückentext-Generator SHALL Kommentar-Zeilen überspringen
4. WHEN der Zeile-für-Zeile-Modus Zeilen durchläuft, THE Zeile-für-Zeile-Modus SHALL Kommentar-Zeilen überspringen
5. WHEN der Rückwärts-Modus Zeilen durchläuft, THE Rückwärts-Modus SHALL Kommentar-Zeilen überspringen

### Requirement 5: Instrumental-Sektionen in der Textanzeige darstellen

**User Story:** Als Nutzer möchte ich Instrumental-Sektionen während des Scrollens im Karaoke- und Stage-Modus sehen, damit ich weiß, wo instrumentale Pausen im Song sind.

#### Acceptance Criteria

1. WHEN der Karaoke-Modus den Songtext anzeigt (Lesemodus), THE StrophenAnzeige SHALL Instrumental-Strophen mit besonderem Styling anzeigen, aber nicht als aktive Zeile behandeln
2. WHEN der Stage-Modus den Songtext anzeigt, THE Stage-Ansicht SHALL Instrumental-Strophen als visuelle Marker zwischen normalen Strophen anzeigen
3. WHEN eine Instrumental-Strophe in der Textanzeige erscheint, THE Textanzeige SHALL den Strophen-Namen (z.B. "[Instrumental]", "[Solo]") als Orientierungsmarker darstellen

### Requirement 6: Kommentar-Zeilen in der Textanzeige darstellen

**User Story:** Als Nutzer möchte ich Kommentar-Zeilen während des Scrollens im Karaoke- und Stage-Modus sehen, damit ich Orientierungspunkte wie "[Pause]" oder "[Bridge - 8 Takte]" habe.

#### Acceptance Criteria

1. WHEN der Karaoke-Modus den Songtext anzeigt (Lesemodus), THE StrophenAnzeige SHALL Kommentar-Zeilen mit besonderem Styling anzeigen, aber nicht als aktive Zeile behandeln
2. WHEN der Stage-Modus den Songtext anzeigt, THE Stage-Ansicht SHALL Kommentar-Zeilen als visuelle Marker zwischen normalen Zeilen anzeigen
3. WHEN eine Kommentar-Zeile in der Textanzeige erscheint, THE Textanzeige SHALL die Zeile visuell von normalen Textzeilen unterscheiden (z.B. kursiv, gedämpfte Farbe)

### Requirement 7: Datenmodell-Erweiterung

**User Story:** Als Entwickler möchte ich das Datenmodell um die nötigen Felder erweitern, damit Instrumental-Sektionen und Kommentar-Zeilen persistent gespeichert werden.

#### Acceptance Criteria

1. THE Prisma-Schema SHALL das Strophe-Modell um ein Feld `istInstrumental` vom Typ `Boolean` mit Standardwert `false` erweitern
2. THE Prisma-Schema SHALL das Zeile-Modell um ein Feld `istKommentar` vom Typ `Boolean` mit Standardwert `false` erweitern
3. THE TypeScript-Typen SHALL `StropheDetail` um das Feld `istInstrumental: boolean` erweitern
4. THE TypeScript-Typen SHALL `ZeileDetail` um das Feld `istKommentar: boolean` erweitern
5. THE API-Eingabetypen SHALL `UpdateStropheInput` um das optionale Feld `istInstrumental?: boolean` erweitern
6. THE API-Eingabetypen SHALL `UpdateZeileInput` um das optionale Feld `istKommentar?: boolean` erweitern

### Requirement 8: API-Endpunkte für Markierungen

**User Story:** Als Entwickler möchte ich die bestehenden Update-Endpunkte nutzen können, um Strophen und Zeilen als Instrumental bzw. Kommentar zu markieren.

#### Acceptance Criteria

1. WHEN ein PATCH-Request für eine Strophe das Feld `istInstrumental` enthält, THE StropheService SHALL den Wert in der Datenbank aktualisieren
2. WHEN ein PATCH-Request für eine Zeile das Feld `istKommentar` enthält, THE ZeileService SHALL den Wert in der Datenbank aktualisieren
3. WHEN die Strophen eines Songs abgerufen werden, THE API SHALL das Feld `istInstrumental` in der Antwort für jede Strophe enthalten
4. WHEN die Zeilen einer Strophe abgerufen werden, THE API SHALL das Feld `istKommentar` in der Antwort für jede Zeile enthalten

### Requirement 9: Fortschrittsberechnung ohne Instrumental-Strophen

**User Story:** Als Nutzer möchte ich, dass Instrumental-Strophen nicht in die Fortschrittsberechnung einfließen, damit mein Lernfortschritt nur den tatsächlich lernbaren Text widerspiegelt.

#### Acceptance Criteria

1. WHEN der Song-Fortschritt berechnet wird, THE Fortschrittsberechnung SHALL Strophen mit `istInstrumental === true` aus der Durchschnittsberechnung ausschließen
2. WHEN alle nicht-instrumentalen Strophen 100% Fortschritt haben, THE Fortschrittsanzeige SHALL den Song als vollständig gelernt anzeigen

### Requirement 10: Song-Import mit Instrumental- und Kommentar-Markierungen

**User Story:** Als Nutzer möchte ich beim Song-Import Strophen als Instrumental und Zeilen als Kommentar markieren können, damit ich die Markierungen nicht nachträglich einzeln setzen muss.

#### Acceptance Criteria

1. WHEN ein Song importiert wird, THE Import-Funktion SHALL das optionale Feld `istInstrumental` pro Strophe akzeptieren
2. WHEN ein Song importiert wird, THE Import-Funktion SHALL das optionale Feld `istKommentar` pro Zeile akzeptieren
3. IF beim Import `istInstrumental` nicht angegeben wird, THEN THE Import-Funktion SHALL den Standardwert `false` verwenden
4. IF beim Import `istKommentar` nicht angegeben wird, THEN THE Import-Funktion SHALL den Standardwert `false` verwenden

### Requirement 12: UI-Controls zum Setzen der Markierungen im Editor

**User Story:** Als Nutzer möchte ich im Song-Editor Strophen als Instrumental und Zeilen als Kommentar markieren und entmarkieren können, damit ich die Markierungen direkt beim Bearbeiten setzen kann.

#### Acceptance Criteria for Requirement 12

1. WHEN der Nutzer eine Strophe im StropheEditor bearbeitet, THE StropheEditor SHALL einen Toggle-Button oder eine Checkbox anzeigen, mit der die Strophe als Instrumental markiert werden kann
2. WHEN der Nutzer den Instrumental-Toggle aktiviert, THE StropheEditor SHALL einen PATCH-Request an die API senden und das Feld `istInstrumental` auf `true` setzen
3. WHEN der Nutzer den Instrumental-Toggle deaktiviert, THE StropheEditor SHALL einen PATCH-Request an die API senden und das Feld `istInstrumental` auf `false` setzen
4. WHEN der Nutzer eine Zeile im ZeileEditor bearbeitet, THE ZeileEditor SHALL einen Toggle-Button oder eine Checkbox anzeigen, mit der die Zeile als Kommentar markiert werden kann
5. WHEN der Nutzer den Kommentar-Toggle aktiviert, THE ZeileEditor SHALL einen PATCH-Request an die API senden und das Feld `istKommentar` auf `true` setzen
6. WHEN der Nutzer den Kommentar-Toggle deaktiviert, THE ZeileEditor SHALL einen PATCH-Request an die API senden und das Feld `istKommentar` auf `false` setzen
7. WHEN eine Strophe als Instrumental markiert ist, THE StropheEditor SHALL die gesamte Strophen-Karte mit einer eigenen Hintergrundfarbe (z.B. gedämpftes Blau/Grau) darstellen, um sie visuell von normalen Strophen abzuheben
8. WHEN eine Zeile als Kommentar markiert ist, THE ZeileEditor SHALL die Zeile mit einer eigenen Hintergrundfarbe und kursiver Schrift darstellen, um sie visuell von normalen Zeilen abzuheben
9. WHEN der Toggle-Status sich ändert, THE Editor SHALL den lokalen State sofort aktualisieren (optimistic update) und bei API-Fehler den vorherigen Zustand wiederherstellen

### Requirement 11: Gemeinsame Filterfunktion für lernbare Inhalte

**User Story:** Als Entwickler möchte ich eine zentrale Filterfunktion haben, die Instrumental-Strophen und Kommentar-Zeilen herausfiltert, damit die Filterlogik nicht in jedem Lernmodus dupliziert wird.

#### Acceptance Criteria

1. THE Shared-Modul SHALL eine Funktion `filterLernbareStrophen` bereitstellen, die Strophen mit `istInstrumental === true` herausfiltert
2. THE Shared-Modul SHALL eine Funktion `filterLernbareZeilen` bereitstellen, die Zeilen mit `istKommentar === true` herausfiltert
3. FOR ALL Eingaben an `filterLernbareStrophen`, die Ausgabe SHALL eine Teilmenge der Eingabe sein, die keine Strophe mit `istInstrumental === true` enthält (Invariante)
4. FOR ALL Eingaben an `filterLernbareZeilen`, die Ausgabe SHALL eine Teilmenge der Eingabe sein, die keine Zeile mit `istKommentar === true` enthält (Invariante)
5. FOR ALL Eingaben ohne Instrumental-Strophen, `filterLernbareStrophen` SHALL die Eingabe unverändert zurückgeben (Idempotenz)
6. FOR ALL Eingaben ohne Kommentar-Zeilen, `filterLernbareZeilen` SHALL die Eingabe unverändert zurückgeben (Idempotenz)
