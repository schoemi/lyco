# ZIP-Bomb-Schutz Bugfix Design

## Übersicht

Der Backup-Import-Service (`src/lib/services/import-service.ts`) verarbeitet hochgeladene ZIP-Archive ohne Sicherheitsprüfungen gegen ZIP-Bomb-Angriffe. Es fehlen drei kritische Validierungen: (1) Prüfung der entpackten Gesamtgröße, (2) Validierung der ZIP-Magic-Bytes vor dem Parsen, (3) Begrenzung der Eintragsanzahl. Zusätzlich sind Upload-Größenlimits in 5 Route-Dateien einzeln hardcodiert, was Wartungsprobleme verursacht.

Der Fix führt eine zentrale Validierungsfunktion `validateZipSecurity` ein, die vor jeder ZIP-Verarbeitung aufgerufen wird, sowie ein zentrales Upload-Konfigurationsmodul für konsistente Größenlimits.

## Glossar

- **Bug_Condition (C)**: Die Bedingung, die den Bug auslöst — ZIP-Archive ohne Magic-Bytes-Prüfung, ohne Größenlimit der entpackten Daten, oder ohne Eintrags-Begrenzung werden ungeprüft verarbeitet
- **Property (P)**: Das gewünschte Verhalten — gefährliche ZIP-Archive werden mit Fehlermeldung abgelehnt, bevor Speicher erschöpft wird
- **Preservation**: Bestehende Import-Funktionalität für gültige Archive und alle anderen Upload-Routen bleiben unverändert
- **`validateImport`**: Funktion in `src/lib/services/import-service.ts`, die ein ZIP-Archiv parst, Manifeste validiert und Konflikte erkennt
- **`executeImport`**: Funktion in `src/lib/services/import-service.ts`, die den tatsächlichen Import in die Datenbank durchführt
- **ZIP-Magic-Bytes**: Die ersten 4 Bytes einer gültigen ZIP-Datei: `PK\x03\x04` (`0x50 0x4B 0x03 0x04`)
- **ZIP-Bomb**: Ein komprimiertes Archiv mit extrem hohem Kompressionsverhältnis, das beim Entpacken den Speicher erschöpft
- **AdmZip**: Die verwendete Node.js-Bibliothek zum Parsen von ZIP-Archiven

## Bug-Details

### Bug-Bedingung

Der Bug manifestiert sich, wenn ein ZIP-Archiv an `/api/backup/import/validate` oder `/api/backup/import/execute` hochgeladen wird und mindestens eine der folgenden Bedingungen zutrifft: (1) die entpackte Gesamtgröße übersteigt 500 MB, (2) die Datei hat keine gültigen ZIP-Magic-Bytes, (3) das Archiv enthält mehr als 1.000 Einträge. In allen Fällen wird die Datei ohne Prüfung direkt an AdmZip übergeben.

**Formale Spezifikation:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ImportInput (zipBuffer: Buffer)
  OUTPUT: boolean

  // Bedingung 1: Keine ZIP-Magic-Bytes
  IF input.zipBuffer.length < 4
     OR input.zipBuffer[0..3] ≠ [0x50, 0x4B, 0x03, 0x04] THEN
    RETURN true
  END IF

  // Bedingung 2: Entpackte Gesamtgröße übersteigt 500 MB
  entries ← parseZipEntries(input.zipBuffer)
  totalUncompressed ← SUM(entry.uncompressedSize FOR entry IN entries)
  IF totalUncompressed > 500 * 1024 * 1024 THEN
    RETURN true
  END IF

  // Bedingung 3: Zu viele Einträge (> 1.000)
  IF COUNT(entries) > 1000 THEN
    RETURN true
  END IF

  RETURN false
END FUNCTION
```

### Beispiele

- **ZIP-Bomb**: Eine 1 MB komprimierte Datei, die auf 2 GB entpackt → aktuell: Server-Speicher erschöpft, OOM-Crash. Erwartet: Fehler `"ZIP-Archiv überschreitet das maximale entpackte Größenlimit (500 MB)"` mit Status 400
- **Keine ZIP-Datei**: Eine JPEG-Datei mit `.zip`-Endung hochgeladen → aktuell: AdmZip wirft unvorhersehbaren Fehler. Erwartet: Fehler `"Ungültiges Dateiformat: Keine gültige ZIP-Datei"` mit Status 400
- **Viele Einträge**: ZIP mit 50.000 leeren Dateien → aktuell: alle Einträge werden iteriert, CPU/Speicher-Verbrauch. Erwartet: Fehler `"ZIP-Archiv enthält zu viele Einträge (max. 1.000)"` mit Status 400
- **Gültiges Archiv**: ZIP mit 5 Songs, 20 MB entpackt, gültige Magic-Bytes → weiterhin korrekt importiert

## Erwartetes Verhalten

### Erhaltungsanforderungen

**Unverändertes Verhalten:**
- Gültige ZIP-Archive mit einzelnem Song-Manifest unter allen Limits werden weiterhin korrekt validiert und importiert
- Gültige ZIP-Archive mit Set-Manifest und mehreren Songs unter allen Limits werden weiterhin korrekt importiert
- Korrupte ZIP-Dateien mit gültigen Magic-Bytes geben weiterhin den Fehler "Archiv konnte nicht gelesen werden" zurück
- Audio-Uploads (MP3/MP4) unter dem konfigurierten Limit funktionieren weiterhin
- PDF-Uploads unter dem konfigurierten Limit funktionieren weiterhin
- Cover-Uploads (JPEG/PNG/WebP) unter dem konfigurierten Limit funktionieren weiterhin
- Konfliktauflösungen (overwrite/new) bei Importen funktionieren weiterhin korrekt

**Scope:**
Alle Eingaben, die KEINE der drei Bug-Bedingungen erfüllen (gültige Magic-Bytes, entpackte Größe ≤ 500 MB, Eintragsanzahl ≤ 1.000), sollen vollständig unverändert verarbeitet werden. Die Zentralisierung der Upload-Limits ändert keine Limit-Werte, sondern nur deren Herkunft.

## Hypothese zur Ursache

Basierend auf der Code-Analyse sind die Ursachen klar identifizierbar:

1. **Fehlende Magic-Bytes-Prüfung**: In `validateImport` und `executeImport` wird der `zipBuffer` direkt an `new AdmZip(zipBuffer)` übergeben (Zeile ~55 und ~320). Es gibt keine vorherige Prüfung, ob die Datei tatsächlich ein ZIP-Archiv ist. AdmZip versucht beliebige Daten zu parsen, was zu unvorhersehbaren Fehlern führt.

2. **Fehlende Größenprüfung der entpackten Daten**: Nach dem Parsen mit `zip.getEntries()` werden alle Einträge iteriert und deren Daten mit `entry.getData()` extrahiert (z.B. in `parseSongManifest`, `createAudioQuellen`, `processCoverFile`). Es gibt keine Prüfung der `header.size` (entpackte Größe) der Einträge vor dem Extrahieren. Bei einer ZIP-Bomb werden alle Daten in den Speicher geladen.

3. **Fehlende Eintrags-Begrenzung**: `zip.getEntries()` gibt alle Einträge zurück, ohne Limit. Bei einem Archiv mit 100.000+ Einträgen werden alle in ein Array geladen und iteriert.

4. **Hardcodierte Upload-Limits**: Jede Route definiert `MAX_FILE_SIZE` lokal:
   - `validate/route.ts`: `100 * 1024 * 1024` (100 MB)
   - `execute/route.ts`: `100 * 1024 * 1024` (100 MB)
   - `parse-pdf/route.ts`: `5 * 1024 * 1024` (5 MB)
   - `audio-upload/route.ts`: `50 * 1024 * 1024` (50 MB)
   - `cover-upload/route.ts`: `5 * 1024 * 1024` (5 MB)

   Es gibt kein zentrales Konfigurationsmodul. Änderungen erfordern Anpassungen in jeder Datei einzeln.

## Correctness Properties

Property 1: Bug Condition - ZIP-Sicherheitsvalidierung lehnt gefährliche Archive ab

_For any_ Eingabe, bei der die Bug-Bedingung zutrifft (isBugCondition gibt true zurück) — d.h. fehlende ZIP-Magic-Bytes, entpackte Gesamtgröße > 500 MB, oder Eintragsanzahl > 1.000 — SOLL die gefixt Funktion die Verarbeitung abbrechen und einen beschreibenden Fehler zurückgeben, ohne den Server-Speicher zu erschöpfen.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Gültige Archive und bestehende Uploads unverändert

_For any_ Eingabe, bei der die Bug-Bedingung NICHT zutrifft (isBugCondition gibt false zurück) — d.h. gültige ZIP-Magic-Bytes, entpackte Größe ≤ 500 MB, und Eintragsanzahl ≤ 1.000 — SOLL die gefixt Funktion dasselbe Ergebnis wie die ursprüngliche Funktion liefern und alle bestehende Import- und Upload-Funktionalität beibehalten.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix-Implementierung

### Erforderliche Änderungen

Unter der Annahme, dass unsere Ursachenanalyse korrekt ist:

**Datei**: `src/lib/upload-config.ts` (NEU)

**Zweck**: Zentrales Konfigurationsmodul für Upload-Limits

**Änderungen**:
1. **Upload-Limits-Konfiguration**: Exportiert benannte Konstanten für alle Upload-Limits:
   - `UPLOAD_LIMITS.BACKUP_IMPORT`: 100 MB (Backup-ZIP-Dateien)
   - `UPLOAD_LIMITS.AUDIO`: 50 MB (Audio-Dateien)
   - `UPLOAD_LIMITS.PDF`: 5 MB (PDF-Dateien)
   - `UPLOAD_LIMITS.COVER`: 5 MB (Cover-Bilder)
   - `UPLOAD_LIMITS.DEFAULT`: 10 MB (Standard-Fallback)
2. **ZIP-Sicherheitslimits**: Exportiert Konstanten für ZIP-Validierung:
   - `ZIP_LIMITS.MAX_UNCOMPRESSED_SIZE`: 500 MB
   - `ZIP_LIMITS.MAX_ENTRY_COUNT`: 1.000
   - `ZIP_MAGIC_BYTES`: `Buffer.from([0x50, 0x4B, 0x03, 0x04])`

---

**Datei**: `src/lib/services/import-service.ts`

**Funktionen**: `validateImport`, `executeImport`

**Änderungen**:
1. **ZIP-Magic-Bytes-Prüfung**: Vor dem Aufruf von `new AdmZip(zipBuffer)` die ersten 4 Bytes gegen `ZIP_MAGIC_BYTES` prüfen. Bei Nichtübereinstimmung sofort Fehler zurückgeben.
2. **Entpackte Größenprüfung**: Nach `zip.getEntries()` die Summe aller `entry.header.size` (entpackte Größe) berechnen. Bei Überschreitung von `ZIP_LIMITS.MAX_UNCOMPRESSED_SIZE` Fehler zurückgeben.
3. **Eintragsanzahl-Prüfung**: Nach `zip.getEntries()` die Anzahl gegen `ZIP_LIMITS.MAX_ENTRY_COUNT` prüfen. Bei Überschreitung Fehler zurückgeben.
4. **Hilfsfunktion `validateZipSecurity`**: Neue exportierte Funktion, die alle drei Prüfungen kapselt und ein Ergebnisobjekt `{ valid: boolean; error?: string }` zurückgibt. Wird am Anfang von `validateImport` und `executeImport` aufgerufen.

---

**Dateien**: 5 Route-Dateien

- `src/app/api/backup/import/validate/route.ts`
- `src/app/api/backup/import/execute/route.ts`
- `src/app/api/songs/parse-pdf/route.ts`
- `src/app/api/songs/[id]/audio-quellen/upload/route.ts`
- `src/app/api/songs/[id]/cover/upload/route.ts`

**Änderungen**:
5. **Lokale `MAX_FILE_SIZE` entfernen**: Die hardcodierten Konstanten durch Imports aus `@/lib/upload-config` ersetzen. Die tatsächlichen Limit-Werte bleiben identisch.

## Teststrategie

### Validierungsansatz

Die Teststrategie folgt einem zweiphasigen Ansatz: Zuerst Gegenbeispiele aufdecken, die den Bug auf dem ungefixten Code demonstrieren, dann verifizieren, dass der Fix korrekt funktioniert und bestehendes Verhalten erhält.

### Explorative Bug-Bedingungsprüfung

**Ziel**: Gegenbeispiele aufdecken, die den Bug VOR der Implementierung des Fixes demonstrieren. Die Ursachenanalyse bestätigen oder widerlegen.

**Testplan**: Tests schreiben, die (1) Nicht-ZIP-Daten an `validateImport` übergeben, (2) ZIP-Archive mit übermäßiger entpackter Größe erstellen, (3) ZIP-Archive mit vielen Einträgen erstellen. Diese Tests auf dem UNGEFIXTEN Code ausführen, um Fehler zu beobachten.

**Testfälle**:
1. **Magic-Bytes-Test**: Einen Buffer mit JPEG-Header an `validateImport` übergeben (wird auf ungefixtem Code unvorhersehbar fehlschlagen)
2. **Größenlimit-Test**: Ein ZIP mit Einträgen erstellen, deren `header.size` zusammen > 500 MB ergibt (wird auf ungefixtem Code den Speicher belasten)
3. **Eintragsanzahl-Test**: Ein ZIP mit > 1.000 Einträgen erstellen (wird auf ungefixtem Code alle Einträge verarbeiten)
4. **Leerer Buffer**: Einen leeren Buffer übergeben (wird auf ungefixtem Code einen AdmZip-Fehler werfen)

**Erwartete Gegenbeispiele**:
- Nicht-ZIP-Daten werden an AdmZip übergeben statt vorher abgelehnt
- Große entpackte Daten werden ohne Prüfung in den Speicher geladen
- Mögliche Ursachen: fehlende Validierungsschicht vor AdmZip-Aufruf

### Fix-Prüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung zutrifft, die gefixt Funktion das erwartete Verhalten zeigt.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := validateZipSecurity(input.zipBuffer)
  ASSERT result.valid = false
  ASSERT result.error IS NOT NULL
  ASSERT serverMemory IS stable
END FOR
```

### Erhaltungsprüfung

**Ziel**: Verifizieren, dass für alle Eingaben, bei denen die Bug-Bedingung NICHT zutrifft, die gefixt Funktion dasselbe Ergebnis wie die ursprüngliche Funktion liefert.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT validateImport_original(input) = validateImport_fixed(input)
  ASSERT executeImport_original(input) = executeImport_fixed(input)
END FOR
```

**Testansatz**: Property-Based Testing wird für die Erhaltungsprüfung empfohlen, da:
- Es automatisch viele Testfälle über den Eingabebereich generiert
- Es Randfälle findet, die manuelle Unit-Tests übersehen könnten
- Es starke Garantien bietet, dass das Verhalten für alle nicht-fehlerhaften Eingaben unverändert bleibt

**Testplan**: Verhalten auf UNGEFIXTEM Code zuerst für gültige ZIP-Archive beobachten, dann Property-Based Tests schreiben, die dieses Verhalten erfassen.

**Testfälle**:
1. **Gültiger Einzel-Song-Import**: Beobachten, dass ein gültiges Song-Archiv korrekt validiert wird, dann Test schreiben, der dies nach dem Fix verifiziert
2. **Gültiger Set-Import**: Beobachten, dass ein gültiges Set-Archiv korrekt validiert wird, dann Test schreiben, der dies nach dem Fix verifiziert
3. **Korruptes ZIP mit Magic-Bytes**: Beobachten, dass der Fehler "Archiv konnte nicht gelesen werden" zurückgegeben wird, dann Test schreiben, der dies nach dem Fix verifiziert
4. **Upload-Limit-Konsistenz**: Verifizieren, dass alle Routen die korrekten Limits aus der zentralen Konfiguration verwenden

### Unit Tests

- `validateZipSecurity` mit verschiedenen Eingaben testen (gültig, keine Magic-Bytes, zu groß, zu viele Einträge)
- Zentrale Upload-Konfiguration auf korrekte Standardwerte testen
- Route-Dateien auf Verwendung der zentralen Konfiguration testen

### Property-Based Tests

- Zufällige Byte-Buffer generieren und verifizieren, dass `validateZipSecurity` Nicht-ZIP-Daten immer ablehnt
- Zufällige gültige ZIP-Archive unter den Limits generieren und verifizieren, dass sie akzeptiert werden
- Verschiedene Kombinationen von Größe und Eintragsanzahl testen

### Integrationstests

- Vollständiger Import-Flow mit gültigem Archiv nach dem Fix
- Ablehnung einer simulierten ZIP-Bomb über die API-Route
- Verifizierung, dass Fehlermeldungen korrekt an den Client weitergegeben werden
