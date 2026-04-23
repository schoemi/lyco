# Requirements Document

## Introduction

Dieses Dokument beschreibt die Anforderungen für die ChordPro-Akkord-Unterstützung in der Lyco Song-Lern-App. Das Feature ermöglicht das Einbetten musikalischer Akkorde im ChordPro-Format (`[Am]`, `[G]`, `[Cmaj7]`) direkt in Zeilentext, den Import und Export von ChordPro-Dateien mit Akkord- und Metadaten-Extraktion, eine neue `tonart`-Eigenschaft am Song-Modell, Editor-Erweiterungen für die Akkordbearbeitung sowie die Akkordanzeige über dem Text in Leseansichten.

Die Akkordnotation verwendet eckige Klammern `[chord]` und ist damit klar getrennt vom bestehenden Vocal-Tag-System, das geschweifte Klammern `{tag: wert}` nutzt.

## Glossary

- **ChordPro_Datei**: Eine Textdatei mit den Endungen `.chopro`, `.cho` oder `.chordpro`, die Akkorde in eckiger Klammer-Notation und Metadaten-Direktiven enthält
- **Akkord**: Ein musikalischer Akkord in eckiger Klammer-Notation, z.B. `[Am]`, `[G]`, `[Cmaj7#11]`, `[Bb/D]`
- **Akkord_Parser**: Die Komponente, die eckige Klammer-Notation `[chord]text` aus Zeilentext extrahiert und in strukturierte Akkord-Positionen umwandelt
- **Akkord_Serializer**: Die Komponente, die strukturierte Akkord-Positionen zurück in eckige Klammer-Notation im Zeilentext serialisiert
- **Tonart**: Die musikalische Tonart eines Songs (z.B. "Am", "C", "F#m"), gespeichert als optionales String-Feld am Song-Modell
- **Metadaten_Direktive**: Eine ChordPro-Direktive in geschweiften Klammern für Song-Metadaten, z.B. `{title: Songname}`, `{artist: Künstler}`, `{key: Am}`
- **Sektions_Direktive**: Eine ChordPro-Direktive für Abschnittsgrenzen, z.B. `{start_of_verse}`, `{start_of_chorus}`, `{end_of_verse}`
- **ChordPro_Importer**: Die Komponente, die ChordPro-Dateien einliest, Akkorde und Metadaten extrahiert und in die bestehende Song-Struktur (Song, Strophe, Zeile) überführt
- **ChordPro_Exporter**: Die Komponente, die einen Song mit Akkorden als ChordPro-Datei exportiert
- **Zeile**: Eine einzelne Textzeile innerhalb einer Strophe, gespeichert im `Zeile`-Modell mit dem Feld `text`
- **Strophe**: Ein Abschnitt eines Songs (Verse, Chorus, Bridge etc.), gespeichert im `Strophe`-Modell
- **Song**: Das Hauptmodell eines Songs mit Metadaten und zugehörigen Strophen
- **Vocal_Tag**: Bestehende Gesangstechnik-Markierungen (Kopfstimme, Bruststimme etc.) im `{tag: wert}`-Format, getrennt vom Akkord-System
- **Akkord_Anzeige**: Die visuelle Darstellung von Akkorden über dem zugehörigen Text in Leseansichten
- **Akkord_Toggle**: Ein Schalter im Editor zum Ein-/Ausblenden der Akkordanzeige
- **Akkord_Eingabe**: Die Eingabemöglichkeit für Akkorde im Editor, bestehend aus einem Leer-Akkord-Button und kürzlich verwendeten Akkorden als Schnellzugriff-Buttons
- **ZeileEditor**: Die bestehende Editor-Komponente für einzelne Zeilen innerhalb einer Strophe
- **StropheEditor**: Die bestehende Editor-Komponente für Strophen-CRUD mit Zeilen

## Requirements

### Requirement 1: Datenmodell – Tonart-Feld

**User Story:** Als Nutzer möchte ich die Tonart eines Songs speichern, damit ich die musikalische Grundtonart auf einen Blick sehen kann.

#### Acceptance Criteria

1. THE Song-Modell SHALL ein optionales String-Feld `tonart` enthalten
2. WHEN ein Song erstellt oder aktualisiert wird, THE Song-Service SHALL den `tonart`-Wert persistieren
3. WHEN ein Song abgerufen wird, THE Song-Service SHALL den `tonart`-Wert in der Antwort zurückgeben
4. WHEN kein `tonart`-Wert gesetzt ist, THE Song-Service SHALL `null` als Wert zurückgeben

### Requirement 2: Akkorde im Zeilentext speichern

**User Story:** Als Nutzer möchte ich Akkorde direkt im Zeilentext in eckiger Klammer-Notation speichern, damit Akkorde fest an ihre Textposition gebunden sind.

#### Acceptance Criteria

1. THE Zeile SHALL Akkorde als `[Akkordname]`-Notation inline im `text`-Feld speichern
2. WHEN ein Akkord an einer Textposition eingefügt wird, THE Zeile SHALL die Notation `[Akkordname]` direkt vor dem zugehörigen Zeichen im `text`-Feld speichern
3. WHEN das Zeichen nach einem Akkord gelöscht wird, THE Editor SHALL den zugehörigen Akkord ebenfalls löschen
4. THE Akkord_Parser SHALL beliebige Akkordnamen innerhalb eckiger Klammern akzeptieren, einschließlich komplexer Akkorde wie `Cmaj7#11` und Slash-Akkorde wie `Bb/D`

### Requirement 3: Akkord-Parser

**User Story:** Als Entwickler möchte ich einen Parser, der Akkorde aus dem Zeilentext extrahiert, damit Akkorde für die Anzeige und Verarbeitung strukturiert verfügbar sind.

#### Acceptance Criteria

1. WHEN ein Zeilentext mit Akkord-Notation übergeben wird, THE Akkord_Parser SHALL eine Liste von Akkord-Objekten mit Name und Zeichenposition zurückgeben
2. WHEN ein Zeilentext ohne Akkorde übergeben wird, THE Akkord_Parser SHALL eine leere Liste zurückgeben
3. THE Akkord_Parser SHALL den reinen Text ohne Akkord-Notation als separaten Wert zurückgeben
4. WHEN mehrere Akkorde in einer Zeile vorkommen, THE Akkord_Parser SHALL alle Akkorde in der korrekten Reihenfolge mit ihren jeweiligen Positionen im reinen Text extrahieren
5. WHEN eine leere Akkord-Notation `[]` vorkommt, THE Akkord_Parser SHALL diese als leeren Akkord-Platzhalter behandeln

### Requirement 4: Akkord-Serializer (Pretty Printer)

**User Story:** Als Entwickler möchte ich einen Serializer, der strukturierte Akkord-Daten zurück in Zeilentext mit Akkord-Notation umwandelt, damit Akkorde konsistent gespeichert werden.

#### Acceptance Criteria

1. WHEN eine Liste von Akkord-Objekten und reiner Text übergeben werden, THE Akkord_Serializer SHALL einen Zeilentext mit korrekt positionierter `[Akkordname]`-Notation erzeugen
2. WHEN keine Akkorde übergeben werden, THE Akkord_Serializer SHALL den reinen Text unverändert zurückgeben
3. FOR ALL gültigen Akkord-Daten, das Parsen des serialisierten Textes und anschließendes erneutes Serialisieren SHALL einen äquivalenten Text erzeugen (Round-Trip-Eigenschaft)

### Requirement 5: ChordPro-Datei-Import

**User Story:** Als Nutzer möchte ich ChordPro-Dateien importieren, damit ich bestehende Songs mit Akkorden in die App übernehmen kann.

#### Acceptance Criteria

1. THE ChordPro_Importer SHALL Dateien mit den Endungen `.chopro`, `.cho` und `.chordpro` akzeptieren
2. WHEN eine ChordPro-Datei importiert wird, THE ChordPro_Importer SHALL Akkorde in eckiger Klammer-Notation `[Am]text` extrahieren und im `text`-Feld der zugehörigen Zeile speichern
3. WHEN eine ChordPro-Datei Metadaten-Direktiven enthält, THE ChordPro_Importer SHALL `{title:}` auf `Song.titel`, `{artist:}` auf `Song.kuenstler` und `{key:}` auf `Song.tonart` abbilden
4. WHEN eine ChordPro-Datei Tempo-Direktiven enthält, THE ChordPro_Importer SHALL `{tempo:}` auf das BPM-Feld des Songs abbilden
5. WHEN eine ChordPro-Datei Taktart-Direktiven enthält, THE ChordPro_Importer SHALL `{time:}` auf die Taktart-Felder (taktZaehler, taktNenner) abbilden
6. WHEN eine ChordPro-Datei Sektions-Direktiven enthält, THE ChordPro_Importer SHALL `{start_of_verse}`, `{start_of_chorus}` und `{start_of_bridge}` auf entsprechende Strophe-Einträge abbilden
7. WHEN eine Sektion durch `{end_of_verse}`, `{end_of_chorus}` oder `{end_of_bridge}` beendet wird, THE ChordPro_Importer SHALL die zugehörige Strophe an dieser Stelle abschließen
8. WHEN eine ChordPro-Datei nicht unterstützte Direktiven enthält (Akkorddiagramme, Tabs, Grids, ABC-Notation, Lilypond), THE ChordPro_Importer SHALL diese Direktiven ignorieren
9. IF eine ChordPro-Datei ungültige Syntax enthält, THEN THE ChordPro_Importer SHALL eine beschreibende Fehlermeldung mit Zeilennummer zurückgeben

### Requirement 6: Import-Integration in bestehende Pipeline

**User Story:** Als Nutzer möchte ich ChordPro-Dateien über die bestehende Import-Oberfläche importieren, damit der Workflow konsistent bleibt.

#### Acceptance Criteria

1. THE Import-Oberfläche SHALL eine neue Import-Methode "ChordPro" neben den bestehenden Methoden (Manuell, Text, PDF, Genius) anbieten
2. WHEN die ChordPro-Import-Methode gewählt wird, THE Import-Oberfläche SHALL einen Datei-Picker für `.chopro`-, `.cho`- und `.chordpro`-Dateien anzeigen
3. WHEN eine ChordPro-Datei erfolgreich geparst wird, THE Import-Pipeline SHALL das Ergebnis in ein `ImportSongInput`-Objekt mit Akkorden im Zeilentext umwandeln
4. WHEN der Import abgeschlossen ist, THE Import-Pipeline SHALL den Song über den bestehenden `importSong()`-Service erstellen

### Requirement 7: Editor – Akkord-Toggle

**User Story:** Als Nutzer möchte ich die Akkordanzeige im Editor ein- und ausschalten können, damit ich mich wahlweise auf Text oder Akkorde konzentrieren kann.

#### Acceptance Criteria

1. THE StropheEditor SHALL einen Toggle-Schalter zum Ein- und Ausblenden der Akkordanzeige enthalten
2. WHEN der Editor geladen wird, THE Akkord_Toggle SHALL standardmäßig ausgeschaltet sein (Akkorde ausgeblendet)
3. WHEN der Akkord_Toggle eingeschaltet wird, THE Editor SHALL Akkorde über dem zugehörigen Text in jeder Zeile anzeigen
4. WHEN der Akkord_Toggle ausgeschaltet wird, THE Editor SHALL die Akkordanzeige ausblenden, ohne die gespeicherten Akkorde zu verändern

### Requirement 8: Editor – Akkord-Eingabe

**User Story:** Als Nutzer möchte ich Akkorde komfortabel im Editor eingeben, damit ich Songs effizient mit Akkorden versehen kann.

#### Acceptance Criteria

1. WHEN die Akkordanzeige eingeschaltet ist, THE ZeileEditor SHALL einen "Leerer Akkord"-Button anzeigen
2. WHEN der "Leerer Akkord"-Button geklickt wird, THE ZeileEditor SHALL `[]` an der aktuellen Cursorposition einfügen und den Cursor zwischen die Klammern setzen
3. WHEN die Akkordanzeige eingeschaltet ist, THE ZeileEditor SHALL kürzlich verwendete Akkorde als Schnellzugriff-Buttons über der Textzeile anzeigen
4. WHEN ein Schnellzugriff-Button geklickt wird, THE ZeileEditor SHALL den entsprechenden Akkord in `[Akkordname]`-Notation an der aktuellen Cursorposition einfügen
5. WHEN ein Akkord-Eingabefeld den Fokus verliert (blur), THE ZeileEditor SHALL den eingegebenen Akkordnamen validieren und parsen
6. WHEN der Song gespeichert wird, THE Editor SHALL alle Akkorde im Zeilentext validieren und parsen

### Requirement 9: Akkordanzeige in Leseansichten

**User Story:** Als Nutzer möchte ich Akkorde über dem Text angezeigt bekommen, damit ich beim Singen die Akkorde an der richtigen Stelle sehen kann.

#### Acceptance Criteria

1. WHEN eine Zeile Akkorde enthält, THE Akkord_Anzeige SHALL jeden Akkord über dem zugehörigen Zeichen im Text positionieren
2. THE Akkord_Anzeige SHALL Akkorde in einer separaten Zeile über der Textzeile darstellen
3. WHEN eine Zeile sowohl Akkorde als auch Vocal_Tags enthält, THE Akkord_Anzeige SHALL Akkorde über dem Text und Vocal_Tags als Badges im Text anzeigen
4. WHEN eine Zeile keine Akkorde enthält, THE Akkord_Anzeige SHALL keine zusätzliche Akkordzeile über dem Text anzeigen

### Requirement 10: ChordPro-Datei-Export

**User Story:** Als Nutzer möchte ich Songs als ChordPro-Dateien exportieren, damit ich sie in anderen Musik-Apps verwenden oder teilen kann.

#### Acceptance Criteria

1. THE ChordPro_Exporter SHALL einen Song als `.chopro`-Datei mit Akkorden in eckiger Klammer-Notation exportieren
2. THE ChordPro_Exporter SHALL Metadaten-Direktiven (`{title:}`, `{artist:}`, `{key:}`) in die exportierte Datei aufnehmen
3. WHEN ein Song BPM-Daten hat, THE ChordPro_Exporter SHALL eine `{tempo:}`-Direktive in die exportierte Datei aufnehmen
4. WHEN ein Song Taktart-Daten hat, THE ChordPro_Exporter SHALL eine `{time:}`-Direktive in die exportierte Datei aufnehmen
5. THE ChordPro_Exporter SHALL Strophen mit passenden Sektions-Direktiven (`{start_of_verse}`, `{end_of_verse}`, `{start_of_chorus}`, `{end_of_chorus}`, `{start_of_bridge}`, `{end_of_bridge}`) umschließen
6. THE ChordPro_Exporter SHALL eine Toggle-Option anbieten, um Vocal_Tags als ChordPro-Direktiven in den Export aufzunehmen
7. WHEN die Vocal-Tag-Option aktiviert ist, THE ChordPro_Exporter SHALL Vocal_Tags als entsprechende ChordPro-Direktiven in die exportierte Datei aufnehmen

### Requirement 11: Export-Round-Trip

**User Story:** Als Entwickler möchte ich sicherstellen, dass Export und Import verlustfrei funktionieren, damit keine Akkord- oder Metadaten beim Konvertieren verloren gehen.

#### Acceptance Criteria

1. FOR ALL Songs mit Akkorden, das Exportieren als ChordPro-Datei und anschließendes Importieren SHALL einen Song mit äquivalenten Akkorden, Metadaten und Strophenstruktur erzeugen
2. FOR ALL gültigen ChordPro-Dateien, das Importieren und anschließendes Exportieren SHALL eine ChordPro-Datei mit äquivalentem Akkord- und Metadaten-Inhalt erzeugen

### Requirement 12: Abgrenzung – Nicht unterstützte Features

**User Story:** Als Entwickler möchte ich klar definieren, welche ChordPro-Features nicht unterstützt werden, damit der Scope begrenzt bleibt.

#### Acceptance Criteria

1. THE ChordPro_Importer SHALL Akkorddiagramm-Direktiven (`{define:}`, `{chord:}`) ignorieren
2. THE ChordPro_Importer SHALL Tab-Direktiven (`{start_of_tab}`, `{end_of_tab}`) ignorieren
3. THE ChordPro_Importer SHALL Grid-Direktiven (`{start_of_grid}`, `{end_of_grid}`) ignorieren
4. THE ChordPro_Importer SHALL ABC-Notation und Lilypond-Direktiven ignorieren
5. THE System SHALL keine Transpositions-Funktionalität bereitstellen
