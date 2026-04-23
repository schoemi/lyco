# Implementation Plan: ChordPro-Akkord-Unterstützung

## Overview

Dieses Feature fügt ChordPro-Akkord-Unterstützung zur Lyco Song-Lern-App hinzu. Die Implementierung erfolgt inkrementell: zuerst Datenmodell und Typen, dann Parser/Serializer-Kernlogik, anschließend Import/Export-Pipeline, und zuletzt Editor- und Anzeige-Komponenten. Jeder Schritt baut auf dem vorherigen auf und wird durch Tests abgesichert.

## Tasks

- [x] 1. Datenmodell und Typen einrichten
  - [x] 1.1 Prisma-Schema erweitern und Migration erstellen
    - Neues optionales Feld `tonart String?` zum `Song`-Modell in `prisma/schema.prisma` hinzufügen
    - Prisma-Migration erstellen und anwenden
    - Prisma-Client neu generieren
    - _Requirements: 1.1_

  - [x] 1.2 TypeScript-Typen für Akkorde erstellen
    - Neue Datei `src/types/chord.ts` mit `ChordPosition`, `ChordParseResult`, `ChordProFileMetadata`, `ChordProFileSection`, `ChordProFileParseResult`, `ChordProFileParseError` erstellen
    - _Requirements: 3.1, 5.2, 5.3_

  - [x] 1.3 Bestehende Song-Typen erweitern
    - `SongDetail` in `src/types/song.ts` um `tonart: string | null` erweitern
    - `ImportSongInput` um optionale Felder `tonart`, `bpm`, `taktZaehler`, `taktNenner` erweitern
    - `UpdateSongInput` um optionales Feld `tonart` erweitern
    - `ImportMode` in `src/types/import.ts` um `"chordpro"` erweitern
    - _Requirements: 1.1, 1.2, 1.3, 5.3, 5.4, 5.5, 6.1_

  - [x] 1.4 Song-Service für Tonart erweitern
    - `importSong()` in `src/lib/services/song-service.ts` anpassen: `tonart` beim Song-Create persistieren
    - `importSong()` anpassen: bei vorhandenem `bpm` ein `BeatErgebnis` mit `methode: MANUELL` erstellen, `taktZaehler`/`taktNenner` übernehmen
    - `updateSong()` anpassen: `tonart` im Update-Objekt berücksichtigen
    - `getSongDetail()` anpassen: `tonart` in der Antwort zurückgeben
    - _Requirements: 1.2, 1.3, 1.4, 5.4, 5.5_

  - [x] 1.5 Unit-Tests für Tonart-Service-Erweiterung schreiben
    - Tests für `importSong()` mit `tonart`, `bpm`, `taktZaehler`, `taktNenner`
    - Tests für `updateSong()` mit `tonart`
    - Tests für `getSongDetail()` mit `tonart`-Rückgabe
    - Tests für `null`-Wert wenn kein `tonart` gesetzt
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 2. Akkord-Parser und Serializer implementieren
  - [x] 2.1 Akkord-Parser implementieren (`src/lib/chords/chord-parser.ts`)
    - Funktion `parseChords(text: string): ChordParseResult` implementieren
    - Extrahiert `[Akkordname]`-Notation aus Zeilentext
    - Gibt `plainText` (ohne Akkorde) und `chords`-Array (mit Name und Position im reinen Text) zurück
    - Leere Klammern `[]` als leeren Akkord-Platzhalter behandeln
    - Beliebige Akkordnamen akzeptieren (inkl. `Cmaj7#11`, `Bb/D`)
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Akkord-Serializer implementieren (`src/lib/chords/chord-serializer.ts`)
    - Funktion `serializeChords(plainText: string, chords: ChordPosition[]): string` implementieren
    - Fügt `[Akkordname]`-Notation an den korrekten Positionen im Text ein
    - Leere Akkordliste gibt reinen Text unverändert zurück
    - Akkord-Positionen außerhalb des Textbereichs am Textende anhängen
    - Leere Akkordnamen als `[]` serialisieren
    - _Requirements: 4.1, 4.2_

  - [x] 2.3 Property-Test: Akkord-Parser/Serializer Round-Trip
    - **Property 1: Akkord-Parser/Serializer Round-Trip**
    - Datei: `__tests__/chordpro-chords/chord-parser-roundtrip.property.test.ts`
    - Für alle gültigen `ChordParseResult`-Objekte: Serialisieren → Parsen ergibt äquivalentes Ergebnis
    - Für alle Texte mit `[Akkord]`-Notation: Parsen → Serialisieren ergibt äquivalenten Text
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 2.2, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3**

  - [x] 2.4 Unit-Tests für Akkord-Parser und Serializer
    - Datei: `__tests__/chordpro-chords/chord-parser.test.ts`
    - Datei: `__tests__/chordpro-chords/chord-serializer.test.ts`
    - Spezifische Beispiele: einfache Akkorde, komplexe Akkorde, Slash-Akkorde, leere Akkorde
    - Edge Cases: leerer Text, Text ohne Akkorde, nur Akkorde ohne Text
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_

- [x] 3. Checkpoint – Kernlogik validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. ChordPro-Datei-Parser implementieren
  - [x] 4.1 ChordPro-Datei-Parser implementieren (`src/lib/chords/chordpro-file-parser.ts`)
    - Funktion `parseChordProFile(content: string): ChordProFileParseResult` implementieren
    - Metadaten-Direktiven parsen: `{title:}`, `{artist:}`, `{key:}`, `{tempo:}`, `{time:}`
    - Sektions-Direktiven parsen: `{start_of_verse}`, `{end_of_verse}`, `{start_of_chorus}`, `{end_of_chorus}`, `{start_of_bridge}`, `{end_of_bridge}`
    - Akkorde `[Am]text` im Zeilentext erhalten
    - Nicht unterstützte Direktiven ignorieren (`{define:}`, `{chord:}`, `{start_of_tab}`, `{start_of_grid}`, ABC, Lilypond)
    - Fehlermeldungen mit Zeilennummer bei ungültiger Syntax
    - Ungültiges Tempo/Taktart als Warnung behandeln
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 12.1, 12.2, 12.3, 12.4_

  - [x] 4.2 Sektionstyp-Mapping implementieren
    - Hilfsfunktion `getSectionType(stropheName: string): 'verse' | 'chorus' | 'bridge' | 'unknown'` implementieren
    - Heuristik: Strophe-Name in Kleinbuchstaben gegen Schlüsselwörter prüfen
    - Unbekannte Namen als `verse` behandeln
    - _Requirements: 5.6, 10.5_

  - [x] 4.3 Property-Test: ChordPro-Datei Metadaten-Extraktion
    - **Property 2: ChordPro-Datei Metadaten-Extraktion**
    - Datei: `__tests__/chordpro-chords/chordpro-file-metadata.property.test.ts`
    - Für alle gültigen Metadaten-Kombinationen: ChordPro-Datei erstellen → Parsen ergibt korrekte Metadaten
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [x] 4.4 Property-Test: ChordPro-Datei Sektions-Parsing
    - **Property 3: ChordPro-Datei Sektions-Parsing**
    - Datei: `__tests__/chordpro-chords/chordpro-file-sections.property.test.ts`
    - Für alle gültigen Sektionsstrukturen: Parser extrahiert korrekte Anzahl Sektionen mit richtigem Typ und Zeilen
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 5.6, 5.7**

  - [x] 4.5 Property-Test: ChordPro-Datei Akkord-Erhaltung
    - **Property 4: ChordPro-Datei Akkord-Erhaltung**
    - Datei: `__tests__/chordpro-chords/chordpro-file-chords.property.test.ts`
    - Für alle ChordPro-Dateien mit Akkorden: Parser erhält Akkorde unverändert im Zeilentext
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 5.2**

  - [x] 4.6 Property-Test: ChordPro-Datei ignoriert nicht unterstützte Direktiven
    - **Property 5: ChordPro-Datei ignoriert nicht unterstützte Direktiven**
    - Datei: `__tests__/chordpro-chords/chordpro-file-unsupported.property.test.ts`
    - Für alle ChordPro-Dateien mit nicht unterstützten Direktiven: Parser ignoriert diese ohne Fehler
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 5.8, 12.1, 12.2, 12.3, 12.4**

  - [x] 4.7 Unit-Tests für ChordPro-Datei-Parser
    - Datei: `__tests__/chordpro-chords/chordpro-file-parser.test.ts`
    - Spezifische Beispiele: vollständige ChordPro-Datei, nur Metadaten, nur Sektionen
    - Edge Cases: leere Datei, fehlende End-Direktiven, ungültige Syntax
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 5. ChordPro-Datei-Exporter implementieren
  - [x] 5.1 ChordPro-Datei-Exporter implementieren (`src/lib/chords/chordpro-file-exporter.ts`)
    - Funktion `exportToChordPro(song: SongDetail, tagDefinitions: TagDefinitionData[], options?: ChordProExportOptions): string` implementieren
    - Metadaten-Direktiven ausgeben: `{title:}`, `{artist:}`, `{key:}`
    - BPM als `{tempo:}`-Direktive ausgeben (wenn vorhanden)
    - Taktart als `{time:}`-Direktive ausgeben (wenn vorhanden)
    - Strophen mit Sektions-Direktiven umschließen (unter Nutzung von `getSectionType()`)
    - Zeilen mit Akkorden in `[Akkord]`-Notation ausgeben
    - Toggle-Option `includeVocalTags` für Vocal-Tag-Export als ChordPro-Direktiven
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 5.2 Property-Test: Export→Import Round-Trip
    - **Property 6: Export→Import Round-Trip**
    - Datei: `__tests__/chordpro-chords/chordpro-export-import.property.test.ts`
    - Für alle Songs mit Akkorden: Exportieren → Importieren ergibt äquivalente Akkorde, Metadaten und Strophenstruktur
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 6.3, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1**

  - [x] 5.3 Property-Test: Import→Export Round-Trip
    - **Property 7: Import→Export Round-Trip**
    - Datei: `__tests__/chordpro-chords/chordpro-import-export.property.test.ts`
    - Für alle gültigen ChordPro-Dateien: Importieren → Exportieren ergibt äquivalenten Akkord- und Metadaten-Inhalt
    - Minimum 100 Iterationen mit `fast-check`
    - **Validates: Requirements 11.2**

  - [x] 5.4 Unit-Tests für ChordPro-Datei-Exporter
    - Datei: `__tests__/chordpro-chords/chordpro-file-exporter.test.ts`
    - Spezifische Beispiele: Song mit Akkorden, mit BPM/Taktart, mit Vocal-Tags
    - Edge Cases: Song ohne Akkorde, Song ohne Metadaten
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 6. Checkpoint – Parser/Exporter validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Import-Pipeline-Integration
  - [x] 7.1 Konvertierungsfunktion implementieren
    - Funktion `chordProToImportInput(result: ChordProFileParseResult): ImportSongInput` in `src/lib/chords/chordpro-file-parser.ts` oder separater Datei implementieren
    - `ChordProFileParseResult` in `ImportSongInput` umwandeln: Metadaten auf Song-Felder, Sektionen auf Strophen/Zeilen
    - Akkorde im `text`-Feld der Zeilen erhalten
    - _Requirements: 6.3_

  - [x] 7.2 ChordPro-Tab in Import-Oberfläche integrieren
    - `ImportMode` in `src/types/import.ts` um `"chordpro"` erweitern (falls nicht in 1.3 erledigt)
    - `ImportTabs` in `src/components/import/import-tabs.tsx` um "ChordPro"-Tab erweitern
    - Neue Komponente für ChordPro-Import-Panel erstellen: Datei-Picker für `.chopro`/`.cho`/`.chordpro`-Dateien
    - Datei parsen, Ergebnis in `ImportSongInput` konvertieren, über `importSong()` erstellen
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.3 Integrationstests für Import-Pipeline
    - Datei: `__tests__/chordpro-chords/chordpro-import-integration.test.ts`
    - Test: ChordPro-Datei → `parseChordProFile()` → `chordProToImportInput()` → valides `ImportSongInput`
    - Test: Akkorde, Metadaten und Strophenstruktur korrekt übertragen
    - _Requirements: 6.3, 6.4_

- [x] 8. Editor-Erweiterungen
  - [x] 8.1 Akkord-Toggle im StropheEditor implementieren
    - Neuen Toggle-Button in der Toolbar von `src/components/songs/strophe-editor.tsx` hinzufügen
    - State `showChords: boolean` (Standard: `false`)
    - `showChords`-Prop an alle `ZeileEditor`-Instanzen weitergeben
    - Toggle schaltet Akkordanzeige ein/aus, ohne gespeicherte Akkorde zu verändern
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.2 Akkord-Eingabe im ZeileEditor implementieren
    - `src/components/songs/zeile-editor.tsx` erweitern: `showChords`-Prop akzeptieren
    - Wenn `showChords` aktiv: "Leerer Akkord"-Button anzeigen, der `[]` an Cursorposition einfügt
    - Wenn `showChords` aktiv: kürzlich verwendete Akkorde als Schnellzugriff-Buttons über der Textzeile anzeigen
    - Schnellzugriff-Button fügt `[Akkordname]` an Cursorposition ein
    - Akkord-Eingabefeld bei Blur validieren und parsen
    - Beim Speichern alle Akkorde im Zeilentext validieren
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 8.3 Unit-Tests für Editor-Erweiterungen
    - Datei: `__tests__/chordpro-chords/chord-toggle.test.ts`
    - Datei: `__tests__/chordpro-chords/chord-eingabe.test.ts`
    - Tests für Toggle-Verhalten: Standard aus, Ein-/Ausschalten
    - Tests für Akkord-Eingabe: Leer-Akkord-Button, Schnellzugriff-Buttons, Cursorposition
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_

- [x] 9. Akkordanzeige-Komponente
  - [x] 9.1 ChordAnzeige-Komponente implementieren
    - Neue Komponente `src/components/songs/chord-anzeige.tsx` erstellen
    - Props: `text: string` (Zeilentext mit `[Akkord]`-Notation)
    - Parst Text mit `parseChords()`, rendert Akkordzeile über der Textzeile
    - Akkorde per CSS an korrekter Zeichenposition ausrichten (monospace/`ch`-Einheit)
    - Keine zusätzliche Zeile wenn keine Akkorde vorhanden-
    - Koexistenz mit Vocal-Tags: Akkorde über Text, Vocal-Tags als Badges im Text
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.2 ChordAnzeige in Leseansichten und Editor einbinden
    - `ChordAnzeige` in `ZeileEditor` (read-only Modus) einbinden wenn Akkorde vorhanden
    - `ChordAnzeige` in Lernmodi-Ansichten einbinden
    - Nur anzeigen wenn Zeile tatsächlich Akkorde enthält
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 9.3 Unit-Tests für ChordAnzeige-Komponente
    - Datei: `__tests__/chordpro-chords/chord-anzeige.test.ts`
    - Tests: Akkorde korrekt positioniert, keine Akkordzeile bei Text ohne Akkorde
    - Tests: Koexistenz mit Vocal-Tags
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10. Final Checkpoint – Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Edge Cases
- Die Akkord-Notation `[chord]` ist vollständig getrennt vom bestehenden Vocal-Tag-System `{tag: wert}`
- BPM und Taktart werden über das bestehende `BeatErgebnis`-Modell mit `methode: MANUELL` gespeichert
