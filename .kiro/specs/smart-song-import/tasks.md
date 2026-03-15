# Implementierungsplan: Smart Song Import

## Übersicht

Erweiterung der bestehenden Import-Seite um zwei neue Import-Wege: Text einfügen (Client-seitiger Parser) und PDF-Upload (LLM-basiert). Aufbau: Typen → Parser-Logik → Property-Tests → API-Route → UI-Komponenten → Seite refactoren → Integration. Neue Dependencies: `pdf-parse`, `openai`.

## Tasks

- [x] 1. Typen und Abhängigkeiten einrichten
  - [x] 1.1 Neue Typen definieren in `src/types/import.ts`
    - `ImportMode`, `ParsedSong`, `ParsedStrophe`, `PdfParseResult` exportieren
    - Typen gemäß Design-Dokument (Abschnitt „Neue Typen")
    - _Requirements: Datenmodelle_

  - [x] 1.2 Dependencies installieren und Umgebungsvariable konfigurieren
    - `npm install pdf-parse openai`
    - `npm install -D @types/pdf-parse`
    - `OPENAI_API_KEY` in `.env.example` dokumentieren (nicht in `.env` selbst)
    - _Requirements: Neue Dependencies, Umgebungsvariablen_

- [x] 2. Songtext-Parser und Hilfsfunktionen implementieren
  - [x] 2.1 Noise-Filter implementieren in `src/lib/import/noise-filter.ts`
    - `isNoiseLine(line: string): boolean` exportieren
    - Patterns: "You might also like", "N Embed", "N Contributors", "See X live", "Get tickets as low as"
    - `[Section]`-Marker dürfen NICHT als Noise gefiltert werden
    - _Requirements: Noise Filter_

  - [x] 2.2 Songtext-Parser implementieren in `src/lib/import/songtext-parser.ts`
    - `parseSongtext(text: string): ParsedSong` exportieren
    - `[Section Name]`-Marker erkennen → neue Strophe
    - Leerzeilen → Strophen-Trennung
    - Ohne Marker + ohne Leerzeilen → alles als eine Strophe „Verse"
    - Leerzeilen ohne Marker → automatisch „Verse 1", „Verse 2", etc.
    - Noise-Zeilen via `isNoiseLine()` filtern
    - _Requirements: Songtext Parser_

  - [x] 2.3 Songtext-Printer implementieren in `src/lib/import/songtext-printer.ts`
    - `printSongtext(parsed: ParsedSong): string` exportieren
    - `[Strophen-Name]` als Marker, Zeilen darunter, Leerzeile zwischen Strophen
    - _Requirements: Songtext Printer_

  - [x] 2.4 Konvertierung implementieren in `src/lib/import/to-import-input.ts`
    - `toImportSongInput(titel, kuenstler, parsed): ImportSongInput` exportieren
    - Mapping von `ParsedSong` auf bestehenden `ImportSongInput`-Typ
    - _Requirements: Konvertierung ParsedSong → ImportSongInput_

- [x] 3. Property-Based Tests für Parser-Logik
  - [x] 3.1 Property-Test: Round-Trip-Konsistenz in `__tests__/songs/songtext-roundtrip.property.test.ts`
    - Für jede gültige `ParsedSong`: `parseSongtext(printSongtext(parsed))` ergibt die gleiche Struktur
    - **Validates: Songtext Parser, Songtext Printer**

  - [x] 3.2 Property-Test: Noise-Filter in `__tests__/songs/noise-filter.property.test.ts`
    - Bekannte Noise-Zeilen werden immer gefiltert
    - `[Section]`-Marker werden nie als Noise erkannt
    - Beliebige Lyrics-Zeilen (ohne Noise-Patterns) werden nicht gefiltert
    - **Validates: Noise Filter**

  - [x] 3.3 Property-Test: Parser-Strophen-Erkennung in `__tests__/songs/songtext-parser.property.test.ts`
    - Text mit N `[Section]`-Markern erzeugt N Strophen mit korrekten Namen
    - Jede Zeile des Inputs erscheint in genau einer Strophe (keine Zeilen verloren)
    - Leere Strophen (nur Marker, keine Zeilen) werden nicht erzeugt
    - **Validates: Songtext Parser**

  - [x] 3.4 Property-Test: Konvertierung in `__tests__/songs/to-import-input.property.test.ts`
    - `toImportSongInput` erzeugt für jede Strophe ein `ImportStropheInput` mit korrektem Namen
    - Anzahl Zeilen pro Strophe bleibt erhalten
    - Titel und Künstler werden korrekt übernommen
    - **Validates: Konvertierung ParsedSong → ImportSongInput**

- [x] 4. Checkpoint – Parser-Logik und Tests validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. PDF-Parse API-Route implementieren
  - [x] 5.1 API-Route erstellen in `src/app/api/songs/parse-pdf/route.ts`
    - `POST`-Handler mit Auth-Check (Session erforderlich)
    - FormData lesen, PDF-Datei extrahieren
    - Validierung: Dateityp `application/pdf`, Größe ≤ 5MB
    - `pdf-parse` für Rohtext-Extraktion
    - OpenAI API Call (gpt-4o-mini) mit strukturiertem Prompt gemäß Design
    - JSON-Antwort validieren und als `PdfParseResult` zurückgeben
    - Fehlerbehandlung: 401 (nicht authentifiziert), 400 (ungültige Datei), 500 (LLM-Fehler)
    - _Requirements: Neue API-Route, OpenAI Prompt_

- [x] 6. UI-Komponenten erstellen
  - [x] 6.1 ImportTabs-Komponente in `src/components/import/import-tabs.tsx`
    - 3 Tabs: „Manuell", „Text einfügen", „PDF Upload"
    - `role="tablist"` mit `aria-label="Import-Methode"`
    - Jeder Tab: `role="tab"`, `aria-selected`, `aria-controls`
    - _Requirements: ImportTabs_

  - [x] 6.2 TextEditor-Komponente in `src/components/import/text-editor.tsx`
    - `<textarea>` mit transparentem Text als Eingabe-Layer
    - Overlay-`<div>` (pointer-events: none) für Syntax-Highlighting
    - `[Section Name]`-Zeilen farblich hervorgehoben (`text-purple-600 font-bold`)
    - `aria-label="Songtext eingeben"`
    - Paste-Event: Plain-Text-Only via `clipboardData.getData('text/plain')`
    - Synchrones Scrollen zwischen textarea und Overlay
    - _Requirements: TextEditor_

  - [x] 6.3 PdfUploader-Komponente in `src/components/import/pdf-uploader.tsx`
    - Drag-and-Drop-Zone mit `onDragOver`, `onDrop`
    - Hidden `<input type="file" accept=".pdf">`
    - Upload-Status: idle, uploading, success, error
    - `aria-live="polite"` für Status-Updates
    - Max 5MB Client-seitige Validierung vor Upload
    - Ruft `POST /api/songs/parse-pdf` auf und gibt Ergebnis via `onResult` zurück
    - _Requirements: PdfUploader_

- [x] 7. Import-Seite refactoren
  - [x] 7.1 `src/app/(main)/songs/import/page.tsx` überarbeiten
    - Tab-Navigation mit `ImportTabs` integrieren
    - Tab „Manuell": bestehendes Formular beibehalten
    - Tab „Text einfügen": `TextEditor` + Metadaten-Felder (Titel, Künstler) + Import-Button
    - Tab „PDF Upload": `PdfUploader` → Ergebnis in TextEditor laden (Vorschau/Bearbeitung)
    - Import-Flow: `parseSongtext()` → `toImportSongInput()` → `POST /api/songs/import`
    - PDF-Flow: Upload → Vorschau im TextEditor → Bearbeitung → Import
    - Fehleranzeige für alle Modi
    - Default-Tab: „Text einfügen"
    - _Requirements: Seitenkomponente, Datenfluss Text-Import, Datenfluss PDF-Import_

- [x] 8. Unit-Tests für Edge Cases
  - [x] 8.1 Unit-Tests für Songtext-Parser in `__tests__/songs/songtext-parser.test.ts`
    - Edge Cases: leerer Text, nur Leerzeilen, nur Noise, gemischte Marker und Leerzeilen-Trennung
    - Test mit Songtext-Sample aus `.planning/Songtext-Sample.md` (Noise-Zeilen in Verse 2)
    - _Requirements: Songtext Parser, Noise Filter_

  - [x] 8.2 Unit-Tests für PDF-API in `__tests__/songs/parse-pdf-api.test.ts`
    - Auth-Check (401 ohne Session)
    - Dateivalidierung (400 bei falscher Datei, zu groß)
    - Erfolgreicher Parse-Flow (Mock von pdf-parse und OpenAI)
    - _Requirements: Neue API-Route_

  - [x] 8.3 Unit-Tests für UI-Komponenten in `__tests__/songs/import-components.test.ts`
    - ImportTabs: korrekte ARIA-Attribute, Tab-Wechsel
    - TextEditor: Highlighting von `[Section]`-Markern im Source-Code
    - PdfUploader: Dateigrößen-Validierung, Status-Anzeige
    - _Requirements: ImportTabs, TextEditor, PdfUploader_

- [x] 9. Abschluss-Checkpoint – Alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Abschnitte aus dem Design-Dokument
- Property-Tests nutzen `fast-check` (bereits als devDependency vorhanden)
- Component-Tests nutzen `fs.readFileSync` String-Matching (node environment, kein jsdom)
- Bestehende Import-API (`POST /api/songs/import`) und Typen (`ImportSongInput`) werden wiederverwendet
- `OPENAI_API_KEY` muss vom Nutzer manuell in `.env` eingetragen werden
