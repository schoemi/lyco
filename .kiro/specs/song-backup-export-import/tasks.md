# Implementierungsplan: Song Backup — Export & Import

## Übersicht

Schrittweise Implementierung des Backup-Features: Zuerst Typen und Serialisierung, dann Export-Service, Import-Service, API-Routen und zuletzt UI-Komponenten. Jeder Schritt baut auf dem vorherigen auf und wird durch Tests abgesichert.

## Tasks

- [x] 1. Backup-Typen und Serialisierung
  - [x] 1.1 Backup-Typen definieren (`src/lib/backup/backup-types.ts`)
    - Alle TypeScript-Interfaces erstellen: `SongManifest`, `StropheManifest`, `ZeileManifest`, `MarkupManifest`, `AudioQuelleManifest`, `SetManifest`, `SetSongEntry`, `ImportValidationResult`, `ImportSongPreview`, `ImportConflict`, `ImportResult`
    - Konstante `CURRENT_EXPORT_VERSION = "1.0"` definieren
    - _Anforderungen: 7.1, 7.2_

  - [x] 1.2 Schema-Validierung implementieren (`src/lib/backup/backup-schema.ts`)
    - Validierungsfunktionen für Song-Manifest und Set-Manifest erstellen
    - Pflichtfelder prüfen (titel, strophen), Enum-Werte validieren (MarkupTyp, AudioTyp, MarkupZiel, AudioRolle)
    - exportVersion-Prüfung: unbekannte Versionen ablehnen mit Fehlermeldung
    - Referenz-Integrität prüfen: Strophen-Referenzen in Markups müssen auf vorhandene Strophen verweisen
    - _Anforderungen: 7.3, 7.5, 10.5_

  - [x] 1.3 Backup-Serializer implementieren (`src/lib/backup/backup-serializer.ts`)
    - `serializeSong()`: Song-Daten aus Prisma-Modell in `SongManifest` umwandeln
    - `deserializeSong()`: `SongManifest` zurück in Song-Daten umwandeln
    - `serializeSet()`: Set-Daten in `SetManifest` umwandeln
    - `deserializeSet()`: `SetManifest` zurück in Set-Daten umwandeln
    - _Anforderungen: 1.1, 1.2, 7.2, 7.3_

  - [ ]* 1.4 Property-Test: Song-Export/Import Round-Trip (Serialisierung)
    - **Property 1: Song-Export/Import Round-Trip**
    - Für zufällig generierte Song-Daten: `deserializeSong(serializeSong(song))` ergibt inhaltlich identische Daten
    - **Validiert: Anforderungen 1.1, 1.2, 1.6, 3.1, 7.1, 7.2, 7.3, 7.4**

  - [ ]* 1.5 Property-Test: Datenintegritätsvalidierung
    - **Property 11: Import-Datenintegritätsvalidierung**
    - Für Manifeste mit ungültigen Strophen-Referenzen in Markups: Validierung schlägt fehl
    - **Validiert: Anforderungen 10.5**

  - [ ]* 1.6 Unit-Tests für Backup-Serializer (`__tests__/backup/backup-serializer.test.ts`)
    - Edge Cases: leere Strophen-Listen, Songs ohne Audio-Quellen, Songs ohne Cover
    - Ungültige JSON-Manifeste, unbekannte exportVersion
    - _Anforderungen: 7.2, 7.3, 7.5_

- [x] 2. Checkpoint — Serialisierung prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer fragen.

- [x] 3. Export-Service implementieren
  - [x] 3.1 Song-Export-Service (`src/lib/services/export-service.ts`)
    - `exportSong(userId, songId)`: Song mit allen Relationen laden (Strophen, Zeilen, Markups, Interpretationen, Notizen, Audio-Quellen)
    - Eigentümerschaft prüfen (403 bei Nicht-Eigentümer)
    - Song-Manifest über `BackupSerializer.serializeSong()` erstellen
    - ZIP-Archiv mit `archiver` erstellen: `song.json` + Upload-Dateien in `uploads/covers/`, `uploads/audio/`, `uploads/referenz-daten/`
    - Fehlende Upload-Dateien tolerieren (graceful degradation)
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1_

  - [x] 3.2 Set-Export-Service (Erweiterung von `export-service.ts`)
    - `exportSet(userId, setId)`: Set mit allen Songs laden
    - Eigentümerschaft prüfen (403)
    - Set-Manifest erstellen, für jeden Song einen nummerierten Unterordner mit Song-Manifest und Upload-Dateien
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.3 Property-Test: Export-Eigentümerschaft
    - **Property 3: Export-Eigentümerschaft**
    - Für alle Nutzer, die nicht Eigentümer sind: Export wird mit 403 abgelehnt
    - **Validiert: Anforderungen 1.7, 2.5, 9.2, 9.4**

  - [ ]* 3.4 Property-Test: Export-Resilienz bei fehlenden Dateien
    - **Property 10: Export-Resilienz bei fehlenden Dateien**
    - Für Songs mit fehlenden Upload-Dateien: Export wird trotzdem erfolgreich durchgeführt
    - **Validiert: Anforderungen 10.1**

  - [ ]* 3.5 Property-Test: Upload-Dateien Round-Trip (Export-Seite)
    - **Property 2: Upload-Dateien Round-Trip**
    - Für Songs mit lokalen Dateien: ZIP enthält Dateien in korrekten Unterordnern
    - **Validiert: Anforderungen 1.3, 1.4, 1.5, 3.2**

- [x] 4. Import-Service implementieren
  - [x] 4.1 Import-Validierung (`src/lib/services/import-service.ts`)
    - `validateImport(userId, zipBuffer)`: ZIP parsen mit `adm-zip`, Manifest extrahieren und validieren
    - Konflikterkennung: Original-IDs gegen bestehende Songs des Nutzers prüfen
    - Nur Songs des authentifizierten Nutzers als Konflikte erkennen
    - Ergebnis als `ImportValidationResult` zurückgeben
    - _Anforderungen: 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Import-Ausführung (Erweiterung von `import-service.ts`)
    - `executeImport(userId, zipBuffer, resolutions)`: Import in Prisma-`$transaction` durchführen
    - Neu-Import-Modus: Neue IDs generieren, interne Referenzen aktualisieren, Upload-Dateien mit neuen Dateinamen speichern
    - Überschreiben-Modus: Bestehende Daten löschen, durch Archiv-Daten ersetzen, Song-ID beibehalten
    - Upload-Dateien in Server-Verzeichnisse kopieren
    - Importierten Song dem authentifizierten Nutzer zuordnen
    - Bei Fehler: Transaktion rollback, bereits kopierte Dateien aufräumen
    - _Anforderungen: 3.1, 3.2, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 10.2, 10.4_

  - [ ]* 4.3 Property-Test: Konflikterkennung
    - **Property 5: Konflikterkennung**
    - Für Archive mit bereits existierenden Song-IDs: Konflikte werden korrekt erkannt; Songs anderer Nutzer sind keine Konflikte
    - **Validiert: Anforderungen 4.1, 4.2, 4.3, 4.4**

  - [ ]* 4.4 Property-Test: Überschreiben-Modus
    - **Property 6: Überschreiben-Modus**
    - Für konflikthaften Song im Überschreiben-Modus: Song-ID bleibt, Inhalte werden vollständig ersetzt
    - **Validiert: Anforderungen 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ]* 4.5 Property-Test: Neu-Import generiert neue IDs
    - **Property 7: Neu-Import generiert neue IDs mit korrekten Referenzen**
    - Für konflikthaften Song im Neu-Import-Modus: Alle IDs sind neu, interne Referenzen korrekt
    - **Validiert: Anforderungen 6.1, 6.2, 6.3**

  - [ ]* 4.6 Property-Test: Import-Eigentümerzuordnung
    - **Property 9: Import-Eigentümerzuordnung**
    - Für alle importierten Songs: Eigentümer ist der authentifizierte Nutzer
    - **Validiert: Anforderungen 3.6, 9.3**

  - [ ]* 4.7 Property-Test: Set-Export/Import Round-Trip
    - **Property 8: Set-Export/Import Round-Trip**
    - Für Sets mit beliebig vielen Songs: Name, Beschreibung, Song-Anzahl und Reihenfolge stimmen überein
    - **Validiert: Anforderungen 2.1, 2.2, 2.3, 2.4, 3.3, 6.4**

- [x] 5. Checkpoint — Services prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer fragen.

- [x] 6. API-Routen erstellen
  - [x] 6.1 Song-Export-Route (`src/app/api/songs/[id]/export/route.ts`)
    - GET-Handler: Authentifizierung prüfen (401), `exportSong()` aufrufen, ZIP als `application/zip` mit Content-Disposition streamen
    - Fehlerbehandlung: 404 bei nicht gefundenem Song, 403 bei Nicht-Eigentümer
    - _Anforderungen: 1.7, 9.1, 9.2_

  - [x] 6.2 Set-Export-Route (`src/app/api/sets/[id]/export/route.ts`)
    - GET-Handler: Authentifizierung prüfen (401), `exportSet()` aufrufen, ZIP streamen
    - Fehlerbehandlung: 404, 403
    - _Anforderungen: 2.5, 9.1, 9.2_

  - [x] 6.3 Import-Validierungs-Route (`src/app/api/backup/import/validate/route.ts`)
    - POST-Handler: Authentifizierung prüfen (401), ZIP aus multipart/form-data lesen
    - Dateigröße prüfen (413 bei >100 MB)
    - `validateImport()` aufrufen, Ergebnis zurückgeben
    - _Anforderungen: 4.1, 9.1, 10.3_

  - [x] 6.4 Import-Ausführungs-Route (`src/app/api/backup/import/execute/route.ts`)
    - POST-Handler: Authentifizierung prüfen (401), ZIP + resolutions aus multipart/form-data lesen
    - `executeImport()` aufrufen, Ergebnis zurückgeben
    - _Anforderungen: 5.1, 6.1, 9.1_

  - [ ]* 6.5 Property-Test: Authentifizierungspflicht
    - **Property 4: Authentifizierungspflicht**
    - Für alle API-Endpunkte: Requests ohne Authentifizierung werden mit 401 abgelehnt
    - **Validiert: Anforderungen 9.1**

  - [ ]* 6.6 Unit-Tests für Export-API (`__tests__/backup/export-api.test.ts`)
    - Tests für 401, 403, 404 und erfolgreichen Export
    - _Anforderungen: 1.7, 9.1, 9.2_

  - [ ]* 6.7 Unit-Tests für Import-API (`__tests__/backup/import-api.test.ts`)
    - Tests für 401, 413, erfolgreiche Validierung, erfolgreichen Import
    - _Anforderungen: 9.1, 10.3, 10.4_

- [x] 7. Checkpoint — API-Routen prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer fragen.

- [x] 8. UI-Komponenten erstellen
  - [x] 8.1 Export-Button für Song-Detailansicht (`src/components/songs/export-button.tsx`)
    - Button-Komponente, die `GET /api/songs/[id]/export` aufruft und den Download auslöst
    - Ladeindikator während des Downloads anzeigen
    - _Anforderungen: 8.1, 8.6_

  - [x] 8.2 Export-Button für Set-Detailansicht (`src/components/songs/set-export-button.tsx`)
    - Button-Komponente, die `GET /api/sets/[id]/export` aufruft und den Download auslöst
    - Ladeindikator während des Downloads anzeigen
    - _Anforderungen: 8.2, 8.6_

  - [x] 8.3 Import-Button für Dashboard (`src/components/import/backup-import-button.tsx`)
    - Button mit Datei-Upload (akzeptiert `.zip`), ruft `POST /api/backup/import/validate` auf
    - Bei Konflikten: Konflikt-Dialog öffnen; ohne Konflikte: direkt `POST /api/backup/import/execute` aufrufen
    - Erfolgsmeldung mit Anzahl importierter Songs anzeigen
    - Ladeindikator während Upload und Import
    - _Anforderungen: 8.3, 8.5, 8.6_

  - [x] 8.4 Konflikt-Dialog (`src/components/import/konflikt-dialog.tsx`)
    - Dialog-Komponente, die für jeden konflikthaften Song die Optionen „Überschreiben" und „Als neuen Song importieren" anbietet
    - Bestätigungs-Button, der die Auflösungen an `POST /api/backup/import/execute` sendet
    - _Anforderungen: 8.4_

- [x] 9. UI-Komponenten in bestehende Seiten integrieren
  - [x] 9.1 Export-Button in Song-Detailansicht einbinden
    - `ExportButton` in die bestehende Song-Detailseite einfügen
    - _Anforderungen: 8.1_

  - [x] 9.2 Export-Button in Set-Detailansicht einbinden
    - `SetExportButton` in die bestehende Set-Detailseite einfügen
    - _Anforderungen: 8.2_

  - [x] 9.3 Import-Button im Dashboard einbinden
    - `BackupImportButton` in die bestehende Dashboard-Seite einfügen
    - _Anforderungen: 8.3_

- [x] 10. Abschluss-Checkpoint
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Nutzer fragen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Nachverfolgbarkeit
- Checkpoints sichern inkrementelle Validierung
- Property-Tests validieren universelle Korrektheitseigenschaften
- Unit-Tests validieren spezifische Beispiele und Edge Cases
