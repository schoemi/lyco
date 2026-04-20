# Implementierungsplan: Song Export

## Übersicht

Das Song-Export-Feature erweitert den bestehenden ZIP-basierten Backup-Export um vier zusätzliche Ausgabeformate: PDF, ChordPro, OnSong und SongbookPro. Die Implementierung umfasst: Export-Typen und Interfaces, einen Format-Filter für Export-Optionen, einen Dateinamen-Generator, vier Formatter-Module (PDF mit PDFKit, ChordPro mit Round-Trip-Parser, OnSong, SongbookPro), die Erweiterung des bestehenden API-Endpunkts und einen Export-Dialog als React-Komponente. Alle Formatter sind reine Funktionen, die unabhängig testbar sind.

## Tasks

- [x] 1. Export-Typen, Format-Filter und Dateinamen-Generator
  - [x] 1.1 Export-Typen und Interfaces in `src/lib/export/export-types.ts` erstellen
    - `ExportFormat` Type (`"pdf" | "chordpro" | "onsong" | "songbookpro"`)
    - `ExportOptions` Interface mit `vocalTags`, `instrumental`, `kommentare` Booleans
    - `FormatterResult` Interface mit `data: Buffer`, `filename`, `contentType`, `extension`
    - `SongFormatter` Type als Funktionssignatur `(song, options) → FormatterResult | Promise<FormatterResult>`
    - `FORMAT_CONFIG` Record mit Content-Types und Dateiendungen pro Format
    - `VOCAL_TAG_TYPES` Array mit allen Vocal-Tag MarkupTypen (ohne TIMECODE)
    - `SongExportData` Interface für die Export-Datenstruktur (mit `istInstrumental`, `istKommentar`, `uebersetzung` Feldern)
    - _Requirements: 1.1, 2.1, 2.3, 2.4, 2.5_

  - [x] 1.2 Format-Filter in `src/lib/export/format-filter.ts` implementieren
    - `applyExportOptions(song: SongExportData, options: ExportOptions): SongExportData` als reine Funktion
    - `vocalTags=false`: Alle Markups mit Typ ∈ {ATMUNG, KOPFSTIMME, BRUSTSTIMME, BELT, FALSETT, PAUSE, WIEDERHOLUNG} aus Strophen und Zeilen entfernen, TIMECODE-Markups erhalten
    - `instrumental=false`: Alle Strophen mit `istInstrumental=true` entfernen
    - `kommentare=false`: Alle Zeilen mit `istKommentar=true` entfernen und `analyse` auf `null` setzen bei allen Strophen
    - Nicht-betroffene Daten (reguläre Zeilen, Nicht-Vocal-Markups, Nicht-instrumentale Strophen) niemals entfernen
    - _Requirements: 2.3, 2.4, 2.5, 10.3_

  - [x] 1.3 Property-Test: Format Filter Correctness
    - **Property 2: Format Filter Correctness**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - Test-Datei: `__tests__/song-export/format-filter.property.test.ts`
    - Generatoren: `arbSongExportData()` und `arbExportOptions()` erstellen
    - Prüft alle vier Teilbedingungen: Vocal-Tags-Entfernung, Instrumental-Entfernung, Kommentar-Entfernung, Nicht-betroffene-Daten-Erhaltung

  - [x] 1.4 Property-Test: Strophe Count Monotonicity
    - **Property 7: Strophe Count Monotonicity**
    - **Validates: Requirements 10.3**
    - Test-Datei: `__tests__/song-export/strophe-count.property.test.ts`
    - Für beliebige SongExportData mit N Strophen und beliebige ExportOptions: Anzahl Strophen nach Filterung ≤ N

  - [x] 1.5 Dateinamen-Generator in `src/lib/export/filename-generator.ts` implementieren
    - `generateExportFilename(titel: string, kuenstler: string | null, extension: string): string`
    - Muster: `"{Titel} - {Künstler}.{ext}"` wenn Künstler vorhanden, sonst `"{Titel}.{ext}"`
    - Ungültige Dateisystem-Zeichen entfernen: `/ \ : * ? " < > |`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 1.6 Property-Test: Filename Generation
    - **Property 3: Filename Generation**
    - **Validates: Requirements 9.1, 9.2, 9.3**
    - Test-Datei: `__tests__/song-export/filename-generation.property.test.ts`
    - Generator: `arbFilenameInput()` mit zufälligen Titel- und Künstler-Strings inkl. Sonderzeichen
    - Prüft Muster-Einhaltung und Abwesenheit ungültiger Zeichen

- [x] 2. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. ChordPro Formatter und Parser
  - [x] 3.1 ChordPro-Formatter in `src/lib/export/formatters/chordpro-formatter.ts` implementieren
    - `formatChordPro(song: SongExportData, options: ExportOptions): FormatterResult`
    - `{title:}` und `{artist:}` Direktiven am Anfang
    - Sektions-Direktiven basierend auf Strophen-Name: Chorus/Refrain → `{start_of_chorus}`, Bridge/Brücke → `{start_of_bridge}`, sonst → `{start_of_verse: <Name>}`
    - Instrumentale Strophen → `{start_of_tab}/{end_of_tab}` + `{comment: [Instrumental]}`
    - Vocal-Tags → `{comment: [<MarkupTyp>] <Wert>}` vor der zugehörigen Zeile
    - Kommentar-Zeilen → `{comment: <Text>}`
    - Übersetzungen → `{comment: ↳ <Übersetzung>}` nach der Zeile
    - Escaping: `{` → `\{`, `}` → `\}` in Liedtexten
    - Dateiname mit `.cho` Endung
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.3, 10.1, 10.2, 11.1, 11.2_

  - [x] 3.2 ChordPro-Parser in `src/lib/export/parsers/chordpro-parser.ts` implementieren
    - `parseChordPro(content: string): SongExportData`
    - Parst `{title:}`, `{artist:}` Direktiven
    - Erkennt Sektions-Direktiven und mappt zurück auf Strophen-Namen
    - Erkennt `{start_of_tab}` als instrumentale Strophe
    - Parst `{comment:}` Direktiven zurück in Vocal-Tags, Kommentare und Übersetzungen
    - Unescaping: `\{` → `{`, `\}` → `}` in Liedtexten
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.3 Property-Test: ChordPro Round-Trip
    - **Property 1: ChordPro Round-Trip**
    - **Validates: Requirements 5.1, 5.2, 5.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
    - Test-Datei: `__tests__/song-export/chordpro-roundtrip.property.test.ts`
    - Generator: `arbSongExportData()` mit Sonderzeichen inkl. `{`, `}`
    - Prüft: `parse(format(song)) ≅ song` — Titel, Künstler, Strophen-Namen, Strophen-Reihenfolge, Zeilen-Texte, Zeilen-Reihenfolge, Markup-Typen/Werte, istInstrumental, istKommentar, Übersetzungen

  - [x] 3.4 Property-Test: Ordering Preservation (ChordPro)
    - **Property 6: Ordering Preservation**
    - **Validates: Requirements 10.1, 10.2**
    - Test-Datei: `__tests__/song-export/ordering-preservation.property.test.ts`
    - Prüft: Strophen in aufsteigender orderIndex-Reihenfolge, Zeilen innerhalb Strophen in aufsteigender orderIndex-Reihenfolge (für ChordPro, OnSong und SongbookPro)

- [x] 4. OnSong und SongbookPro Formatter
  - [x] 4.1 OnSong-Formatter in `src/lib/export/formatters/onsong-formatter.ts` implementieren
    - `formatOnSong(song: SongExportData, options: ExportOptions): FormatterResult`
    - Zeile 1: Titel, Zeile 2: Künstler (oder leer), Zeile 3: Leerzeile
    - Sektions-Header: `Verse 1:`, `Chorus:`, `Bridge:` etc. basierend auf Strophen-Name
    - Instrumentale Strophen → `Instrumental:` als Sektions-Header
    - Vocal-Tags → `;[<MarkupTyp>] <Wert>` (Kommentarzeile mit `;`)
    - Kommentar-Zeilen → `;<Text>`
    - Übersetzungen → `; ↳ <Übersetzung>` nach der Zeile
    - Dateiname mit `.onsong` Endung
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 10.1, 10.2, 11.1, 11.2_

  - [x] 4.2 Property-Test: OnSong Formatter Structure
    - **Property 4: OnSong Formatter Structure**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 11.1**
    - Test-Datei: `__tests__/song-export/onsong-formatter.property.test.ts`
    - Prüft: Titel als erste Zeile, Künstler als zweite Zeile, Sektions-Header für jede Strophe, Instrumental-Header, Kommentar-Zeilen mit `;`, Vocal-Tag-Zeilen mit `;`, Übersetzungs-Zeilen

  - [x] 4.3 SongbookPro-Formatter in `src/lib/export/formatters/songbookpro-formatter.ts` implementieren
    - `formatSongbookPro(song: SongExportData, options: ExportOptions): FormatterResult`
    - Metadaten-Header: `Title: ...`, `Artist: ...`
    - Sektions-Tags: `[Verse 1]`, `[Chorus]`, `[Bridge]` etc.
    - Instrumentale Strophen → `[Instrumental]`
    - Vocal-Tags → `# [<MarkupTyp>] <Wert>` (Kommentarzeile mit `#`)
    - Kommentar-Zeilen → `# <Text>`
    - Übersetzungen → `# ↳ <Übersetzung>` nach der Zeile
    - Dateiname mit `.sbp` Endung
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.1, 10.2, 11.1, 11.2_

  - [x] 4.4 Property-Test: SongbookPro Formatter Structure
    - **Property 5: SongbookPro Formatter Structure**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.1**
    - Test-Datei: `__tests__/song-export/songbookpro-formatter.property.test.ts`
    - Prüft: `Title:` und `Artist:` Header, Sektions-Tags in eckigen Klammern, Instrumental-Tag, Kommentar-Zeilen mit `#`, Vocal-Tag-Zeilen mit `#`, Übersetzungs-Zeilen

- [x] 5. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. PDF Formatter
  - [x] 6.1 pdfkit Dependency installieren
    - `pdfkit` (^0.16.0) als Dependency hinzufügen
    - `@types/pdfkit` als devDependency hinzufügen (falls verfügbar)
    - _Requirements: 3.1_

  - [x] 6.2 PDF-Formatter in `src/lib/export/formatters/pdf-formatter.ts` implementieren
    - `formatPdf(song: SongExportData, options: ExportOptions): Promise<FormatterResult>`
    - A4-Format, Ränder 50pt
    - Kopfzeile: Titel (20pt bold) + Künstler (14pt regular)
    - Strophen-Name als Überschrift (12pt bold), Zeilen darunter (11pt regular)
    - Vocal-Tags als farbige Inline-Markierungen (9pt) vor dem zugehörigen Text, Farben je nach MarkupTyp
    - Instrumentale Strophen mit "[Instrumental]"-Label
    - Kommentar-Zeilen kursiv (11pt italic), Analyse-Texte eingerückt (10pt, 20pt Einrückung)
    - Übersetzungen unterhalb der Original-Zeile (10pt, grau)
    - Dateiname mit `.pdf` Endung
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2, 11.1, 11.2_

  - [x] 6.3 Unit-Tests für PDF-Formatter
    - Prüft PDF-Erzeugung mit Beispiel-Song (Titel, Strophen, Markups vorhanden)
    - Prüft dass generiertes PDF ein gültiger Buffer ist
    - Prüft korrekten Content-Type und Dateinamen
    - Test-Datei: `__tests__/song-export/pdf-formatter.test.ts`
    - _Requirements: 3.1, 3.2, 3.6_

- [x] 7. API-Endpunkt erweitern und Export-Service verdrahten
  - [x] 7.1 Export-Service in `src/lib/services/export-service.ts` erweitern
    - Neue Funktion `exportSongFormatted(userId, songId, format, options): Promise<{ data: Buffer; filename: string; contentType: string }>`
    - Song mit allen Relationen laden (bestehende Prisma-Query wiederverwenden)
    - Eigentümerschaftsprüfung
    - Format-Filter anwenden via `applyExportOptions()`
    - Ausgewählten Formatter aufrufen basierend auf `format`-Parameter
    - Dateinamen via `generateExportFilename()` generieren
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_

  - [x] 7.2 API-Route in `src/app/api/songs/[id]/export/route.ts` erweitern
    - Neuer Query-Parameter `format` (pdf, chordpro, onsong, songbookpro)
    - Neue Query-Parameter `vocalTags`, `instrumental`, `kommentare` (jeweils "true"/"false")
    - Ohne `format`-Parameter: bestehender ZIP-Export (Rückwärtskompatibilität)
    - Mit `format`-Parameter: neuer Format-Export via `exportSongFormatted()`
    - Ungültiger `format`-Wert → 400 mit beschreibender Fehlermeldung
    - Content-Disposition-Header mit generiertem Dateinamen setzen
    - Korrekten Content-Type je Format setzen
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.4_

  - [x] 7.3 Unit-Tests für API-Route und Export-Service
    - Prüft 400 bei ungültigem Format
    - Prüft 401 bei fehlender Authentifizierung
    - Prüft 403 bei fremdem Song
    - Prüft 404 bei nicht existierendem Song
    - Prüft 500 bei unerwartetem Fehler
    - Prüft korrekten Content-Type und Content-Disposition für jedes Format
    - Prüft Rückwärtskompatibilität (kein format-Parameter → ZIP)
    - Test-Datei: `__tests__/song-export/export-api.test.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.4_

- [x] 8. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Export-Dialog UI-Komponente
  - [x] 9.1 ExportDialog-Komponente in `src/components/songs/export-dialog.tsx` erstellen
    - Modal-Dialog mit `role="dialog"`, `aria-modal="true"`, Escape-zum-Schließen, Fokus-Management
    - Vier Format-Buttons als Radio-Auswahl (PDF, ChordPro, OnSong, SongbookPro)
    - Drei Toggle-Switches für Export-Optionen: Vocal-Tags, Instrumental-Sektionen, Kommentare
    - Alle drei Toggles standardmäßig auf aktiviert
    - Export-Schaltfläche deaktiviert solange kein Format ausgewählt
    - Lade-Indikator während des Exports
    - Fehlerbehandlung: Fehlermeldung bei Netzwerkfehler mit Möglichkeit zum erneuten Versuch
    - GET-Request an `/api/songs/[id]/export?format=...&vocalTags=...&instrumental=...&kommentare=...` auslösen
    - Datei-Download im Browser triggern
    - Bestehende Dialog-Patterns folgen (vgl. `SetEditDialog`)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [x] 9.2 Export-Dialog in Song-Detail-Seite integrieren
    - Export-Button auf der Song-Detail-Seite hinzufügen
    - ExportDialog mit `songId`, `songTitel`, `songKuenstler` Props öffnen
    - _Requirements: 1.1_

  - [x] 9.3 Unit-Tests für Export-Dialog
    - Prüft Rendering aller 4 Format-Optionen und 3 Toggles
    - Prüft Radio-Auswahl-Verhalten (genau ein Format aktiv)
    - Prüft Toggle-Defaults (alle aktiviert)
    - Prüft Button-Deaktivierung ohne Format-Auswahl
    - Test-Datei: `__tests__/song-export/export-dialog.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [x] 10. Abschluss-Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für die Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design-Dokument
- Unit-Tests validieren spezifische Beispiele und Randfälle
- Alle Formatter sind reine Funktionen `(SongExportData, ExportOptions) → FormatterResult` und unabhängig testbar
- Der bestehende ZIP-Export bleibt rückwärtskompatibel (kein `format`-Parameter → ZIP)
- Das Projekt verwendet `fast-check` (v4.6.0) mit `vitest` für Property-Based Tests
- Neue Dependency: `pdfkit` (^0.16.0) für PDF-Generierung
