# Bugfix Requirements Document

## Einleitung

Der Backup-Import-Service (`src/lib/services/import-service.ts`) ist anfällig für ZIP-Bomb-Angriffe und andere Denial-of-Service-Vektoren. ZIP-Archive werden ohne Prüfung der entpackten Größe, ohne Magic-Bytes-Validierung und ohne Begrenzung der Eintragsanzahl verarbeitet. Zusätzlich sind Upload-Größenlimits in jeder Route einzeln hardcodiert, was Inkonsistenzen und Wartungsprobleme verursacht. Die Schwere ist hoch, da ein Angreifer mit einer kleinen ZIP-Datei den Server durch Speichererschöpfung zum Absturz bringen kann.

## Bug-Analyse

### Aktuelles Verhalten (Defekt)

1.1 WENN eine ZIP-Datei hochgeladen wird, deren komprimierte Größe unter 100 MB liegt, aber deren entpackte Gesamtgröße mehrere GB beträgt (ZIP-Bomb), DANN verarbeitet das System die Datei ohne Begrenzung und der Server-Speicher wird erschöpft (DoS)

1.2 WENN eine Datei hochgeladen wird, die keine gültige ZIP-Datei ist (fehlende ZIP-Magic-Bytes `PK\x03\x04`), DANN wird die Datei direkt an AdmZip übergeben, was zu unvorhersehbaren Fehlern oder Sicherheitsproblemen führt

1.3 WENN ein ZIP-Archiv mit einer extrem hohen Anzahl an Einträgen (z.B. 100.000+) hochgeladen wird, DANN verarbeitet das System alle Einträge ohne Begrenzung, was zu übermäßigem Speicher- und CPU-Verbrauch führt

1.4 WENN die Upload-Größenlimits geändert werden sollen, DANN müssen diese in jeder Route einzeln angepasst werden (`validate/route.ts`: 100 MB, `execute/route.ts`: 100 MB, `parse-pdf/route.ts`: 5 MB, `audio-upload/route.ts`: 50 MB, `cover-upload/route.ts`: 5 MB), da die Werte hardcodiert sind

### Erwartetes Verhalten (Korrekt)

2.1 WENN eine ZIP-Datei hochgeladen wird, deren entpackte Gesamtgröße ein konfiguriertes Limit (Standard: 500 MB) überschreitet, DANN SOLL das System die Verarbeitung abbrechen und einen Fehler zurückgeben, bevor der Speicher erschöpft wird

2.2 WENN eine Datei hochgeladen wird, deren erste 4 Bytes nicht den ZIP-Magic-Bytes (`PK\x03\x04` / `0x504B0304`) entsprechen, DANN SOLL das System die Datei sofort ablehnen, ohne sie an AdmZip zu übergeben

2.3 WENN ein ZIP-Archiv mehr als eine konfigurierte maximale Anzahl an Einträgen (Standard: 1.000) enthält, DANN SOLL das System die Verarbeitung abbrechen und einen Fehler zurückgeben

2.4 WENN Upload-Größenlimits definiert werden, DANN SOLL das System diese aus einer zentralen Konfiguration beziehen (Standard: 10 MB allgemein, mit spezifischen Überschreibungen pro Route), sodass Änderungen nur an einer Stelle nötig sind

### Unverändertes Verhalten (Regressionsprävention)

3.1 WENN eine gültige ZIP-Datei mit einem einzelnen Song-Manifest hochgeladen wird, deren entpackte Größe unter dem Limit liegt, DANN SOLL das System WEITERHIN den Import korrekt validieren und ausführen

3.2 WENN eine gültige ZIP-Datei mit einem Set-Manifest und mehreren Songs hochgeladen wird, deren entpackte Größe und Eintragsanzahl unter den Limits liegen, DANN SOLL das System WEITERHIN alle Songs korrekt importieren

3.3 WENN ein ungültiges ZIP-Archiv (korrupte Daten, aber mit gültigen Magic-Bytes) hochgeladen wird, DANN SOLL das System WEITERHIN den Fehler "Archiv konnte nicht gelesen werden" zurückgeben

3.4 WENN eine Audio-Datei (MP3/MP4) unter dem konfigurierten Größenlimit hochgeladen wird, DANN SOLL das System WEITERHIN den Upload korrekt verarbeiten

3.5 WENN eine PDF-Datei unter dem konfigurierten Größenlimit hochgeladen wird, DANN SOLL das System WEITERHIN die PDF-Analyse korrekt durchführen

3.6 WENN eine Cover-Datei (JPEG/PNG/WebP) unter dem konfigurierten Größenlimit hochgeladen wird, DANN SOLL das System WEITERHIN den Cover-Upload korrekt verarbeiten

3.7 WENN Konflikte bei einem Import erkannt werden und Auflösungen (overwrite/new) angegeben sind, DANN SOLL das System WEITERHIN die Konflikte korrekt auflösen

---

## Bug-Bedingung (Formale Definition)

### Bug-Bedingungsfunktion

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ImportInput (zipBuffer, fileSize, entries)
  OUTPUT: boolean

  // Bedingung 1: ZIP-Bomb (entpackte Größe übersteigt Limit)
  IF totalUncompressedSize(X.zipBuffer) > MAX_UNCOMPRESSED_SIZE THEN
    RETURN true
  END IF

  // Bedingung 2: Keine gültigen ZIP-Magic-Bytes
  IF X.zipBuffer[0..3] ≠ [0x50, 0x4B, 0x03, 0x04] THEN
    RETURN true
  END IF

  // Bedingung 3: Zu viele Einträge
  IF entryCount(X.zipBuffer) > MAX_ENTRY_COUNT THEN
    RETURN true
  END IF

  RETURN false
END FUNCTION
```

### Property-Spezifikation

```pascal
// Property: Fix Checking – ZIP-Bomb-Schutz
FOR ALL X WHERE isBugCondition(X) DO
  result ← validateImport'(X) OR executeImport'(X)
  ASSERT result.error IS NOT NULL
  ASSERT serverMemory IS stable
  ASSERT no_crash(result)
END FOR
```

### Erhaltungsziel

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT validateImport(X) = validateImport'(X)
  ASSERT executeImport(X) = executeImport'(X)
END FOR
```
