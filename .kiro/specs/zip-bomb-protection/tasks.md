# Aufgaben: ZIP-Bomb-Schutz

## Aufgabe 1: Zentrale Upload-Konfiguration erstellen

- [x] 1.1 Datei `src/lib/upload-config.ts` erstellen mit `UPLOAD_LIMITS`-Objekt (BACKUP_IMPORT: 100 MB, AUDIO: 50 MB, PDF: 5 MB, COVER: 5 MB, DEFAULT: 10 MB)
- [x] 1.2 `ZIP_LIMITS`-Objekt exportieren (MAX_UNCOMPRESSED_SIZE: 500 MB, MAX_ENTRY_COUNT: 1.000)
- [x] 1.3 `ZIP_MAGIC_BYTES`-Konstante exportieren (`Buffer.from([0x50, 0x4B, 0x03, 0x04])`)

## Aufgabe 2: ZIP-Sicherheitsvalidierung implementieren

- [x] 2.1 Funktion `validateZipSecurity(zipBuffer: Buffer)` in `src/lib/services/import-service.ts` erstellen, die Magic-Bytes prüft, entpackte Gesamtgröße berechnet (Summe aller `entry.header.size`) und Eintragsanzahl prüft
- [x] 2.2 `validateZipSecurity` am Anfang von `validateImport` aufrufen — bei Fehler sofort `{ valid: false, error: ... }` zurückgeben
- [x] 2.3 `validateZipSecurity` am Anfang von `executeImport` aufrufen — bei Fehler sofort `throw new Error(...)` werfen

## Aufgabe 3: Hardcodierte Upload-Limits durch zentrale Konfiguration ersetzen

- [x] 3.1 In `src/app/api/backup/import/validate/route.ts` lokales `MAX_FILE_SIZE` durch `UPLOAD_LIMITS.BACKUP_IMPORT` aus `@/lib/upload-config` ersetzen
- [x] 3.2 In `src/app/api/backup/import/execute/route.ts` lokales `MAX_FILE_SIZE` durch `UPLOAD_LIMITS.BACKUP_IMPORT` aus `@/lib/upload-config` ersetzen
- [x] 3.3 In `src/app/api/songs/parse-pdf/route.ts` lokales `MAX_FILE_SIZE` durch `UPLOAD_LIMITS.PDF` aus `@/lib/upload-config` ersetzen
- [x] 3.4 In `src/app/api/songs/[id]/audio-quellen/upload/route.ts` lokales `MAX_FILE_SIZE` durch `UPLOAD_LIMITS.AUDIO` aus `@/lib/upload-config` ersetzen
- [x] 3.5 In `src/app/api/songs/[id]/cover/upload/route.ts` lokales `MAX_FILE_SIZE` durch `UPLOAD_LIMITS.COVER` aus `@/lib/upload-config` ersetzen

## Aufgabe 4: Unit Tests für ZIP-Sicherheitsvalidierung

- [x] 4.1 Testdatei `__tests__/backup/zip-security-validation.test.ts` erstellen
- [x] 4.2 Test: `validateZipSecurity` lehnt Buffer ohne ZIP-Magic-Bytes ab (JPEG-Header, leerer Buffer, zufällige Bytes)
- [x] 4.3 Test: `validateZipSecurity` lehnt ZIP mit entpackter Gesamtgröße > 500 MB ab (Mock der Entry-Header-Größen)
- [x] 4.4 Test: `validateZipSecurity` lehnt ZIP mit > 1.000 Einträgen ab
- [x] 4.5 Test: `validateZipSecurity` akzeptiert gültiges ZIP unter allen Limits

## Aufgabe 5: Unit Tests für zentrale Upload-Konfiguration

- [x] 5.1 Testdatei `__tests__/backup/upload-config.test.ts` erstellen
- [x] 5.2 Test: `UPLOAD_LIMITS` enthält korrekte Standardwerte für alle Routen
- [x] 5.3 Test: `ZIP_LIMITS` enthält korrekte Werte (500 MB, 1.000 Einträge)
- [x] 5.4 Test: `ZIP_MAGIC_BYTES` entspricht `[0x50, 0x4B, 0x03, 0x04]`

## Aufgabe 6: Property-Based Tests

- [x] 6.1 PBT-Datei `__tests__/backup/zip-bomb-bugcondition.property.test.ts` erstellen — Property 1: Für zufällige Byte-Buffer ohne gültige ZIP-Magic-Bytes gibt `validateZipSecurity` immer `{ valid: false }` zurück
- [x] 6.2 PBT-Datei `__tests__/backup/zip-bomb-preservation.property.test.ts` erstellen — Property 2: Für gültige ZIP-Archive unter allen Limits gibt `validateZipSecurity` immer `{ valid: true }` zurück und `validateImport` liefert dasselbe Ergebnis wie vor dem Fix

## Aufgabe 7: Integrationstests und bestehende Tests anpassen

- [x] 7.1 Sicherstellen, dass alle bestehenden Tests weiterhin bestehen (keine Regression durch die Änderungen)
- [x] 7.2 Integrationstest: Vollständiger Import-Flow mit gültigem Archiv nach dem Fix funktioniert
