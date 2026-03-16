# Implementierungsplan: Automatische Songtext-Übersetzung

## Übersicht

Inkrementelle Implementierung der LLM-basierten Songtext-Übersetzung für Lyco. Beginnt mit den Typen-Definitionen, dann Übersetzungs-Service mit Prompt-Builder und Validierung, API-Route und abschließend Wiring und Tests. Alle Komponenten werden in TypeScript implementiert und folgen dem bewährten Muster der Smart-Song-Analysis (API-Route → Service → LLM-Client → Prisma). Keine Prisma-Schema-Änderungen nötig, da das Feld `uebersetzung` am Zeile-Modell bereits existiert.

## Tasks

- [x] 1. Übersetzungs-Typen definieren
  - [x] 1.1 Übersetzungs-Typen in `src/types/song.ts` ergänzen
    - `UebersetzungResult`-Interface mit `songId`, `zielsprache`, `strophen` anlegen
    - `StropheUebersetzungResult`-Interface mit `stropheId`, `stropheName`, `zeilen` anlegen
    - `ZeileUebersetzungResult`-Interface mit `zeileId`, `originalText`, `uebersetzung` anlegen
    - Prüfen, dass das bestehende `ZeileDetail`-Interface bereits `uebersetzung: string | null` enthält
    - _Requirements: 1.3, 6.1, 6.2_

- [x] 2. Übersetzungs-Service implementieren
  - [x] 2.1 Prompt-Builder und Antwort-Validierung in `src/lib/services/uebersetzungs-service.ts` implementieren
    - `UebersetzungsError`-Klasse analog zu `AnalyseError` erstellen (mit `statusCode`)
    - `buildUebersetzungPrompt(song, zielsprache)`-Funktion: System-Prompt (Rolle als professioneller Songtext-Übersetzer, poetischer Charakter und emotionale Bedeutung bewahren) und User-Prompt (Titel, Künstler, Zielsprache, vollständiger Songtext mit Strophen-Markierungen, JSON-Antwortstruktur) zusammenstellen
    - `validateUebersetzungResponse(raw, strophen)`-Funktion: JSON parsen, Schema validieren (strophen-Array, je stropheIndex + uebersetzungen-Array, Anzahl Strophen prüfen, Anzahl Zeilen pro Strophe prüfen, jede Übersetzung nicht-leerer String)
    - Leere Strophen (ohne Zeilen) beim Prompt-Aufbau überspringen
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.2 Property-Test: Prompt-Vollständigkeit
    - Datei: `__tests__/translation/prompt-completeness.property.test.ts`
    - Song-Generator mit fast-check (Titel, optionaler Künstler, 1-5 Strophen mit 1-10 Zeilen)
    - Prüfen: System-Nachricht enthält Rolle als Übersetzer und Hinweis auf poetischen Charakter; User-Nachricht enthält Titel, Künstler (falls vorhanden), Zielsprache, alle Zeilen aller Strophen, JSON-Anweisungen
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 2.3 Property-Test: Antwort-Validierung lehnt ungültiges JSON ab
    - Datei: `__tests__/translation/response-validation.property.test.ts`
    - Invalid-JSON-Generator (kein JSON, fehlende Felder, falsche Typen, falsche Strophen-Anzahl, falsche Zeilen-Anzahl pro Strophe, leere Übersetzungsstrings)
    - Prüfen: Validierungsfunktion lehnt ab und gibt beschreibende Fehlermeldung zurück
    - **Validates: Requirements 3.5, 3.6**

  - [x] 2.4 `translateSong`-Funktion implementieren
    - Song mit Strophen und Zeilen via Prisma laden (sortiert nach `orderIndex`)
    - Ownership-Check (`userId === song.userId`) → 403
    - Prüfung ob Song Strophen mit Zeilen hat (sonst Fehler 400)
    - Zielsprache validieren: leerer String → Fehler 400, `undefined` → Default „Deutsch"
    - Concurrency-Guard: In-Memory-`Set<string>` mit aktiven Song-IDs, Prüfung vor Start → 409, Freigabe im `finally`-Block
    - Prompt bauen, LLM-Client aufrufen, Antwort validieren
    - Übersetzungen zeilenweise im Feld `uebersetzung` via Prisma `update` speichern
    - Fehler-Mapping: Timeout, Rate-Limit (429), ungültiges JSON → benutzerfreundliche Meldungen
    - Fehler-Logging mit `console.error` im Format `[UebersetzungsService] Fehler bei Song {songId}: {fehlerTyp} - {details}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.5 `getTranslation`-Funktion implementieren
    - Song mit Strophen und Zeilen via Prisma laden
    - Ownership-Check
    - Gespeicherte Übersetzungen als `UebersetzungResult` zurückgeben (oder `null` wenn keine Übersetzungen vorhanden)
    - _Requirements: 4.4, 6.1, 6.3_

  - [ ]* 2.6 Property-Test: Übersetzungs-Round-Trip
    - Datei: `__tests__/translation/translation-roundtrip.property.test.ts`
    - Song-Generator + LLM-Response-Generator (schema-konform, passend zur Strophen- und Zeilen-Anzahl)
    - LLM-Client mocken, Prisma mocken
    - Prüfen: Ergebnis enthält songId, zielsprache, strophen mit korrekter Anzahl, jede Zeile hat nicht-leere Übersetzung, korrekte Zuordnung via zeileId
    - **Validates: Requirements 1.2, 1.3, 3.7, 6.1**

  - [ ]* 2.7 Property-Test: Concurrency-Guard
    - Datei: `__tests__/translation/concurrency-guard.property.test.ts`
    - Prüfen: Gleichzeitige Übersetzungs-Anfrage für denselben Song wird mit 409 und Meldung „Eine Übersetzung läuft bereits für diesen Song." abgelehnt
    - **Validates: Requirements 5.4**

  - [ ]* 2.8 Property-Test: Fehler-Logging
    - Datei: `__tests__/translation/error-logging.property.test.ts`
    - Error-Generator (Timeout, Rate-Limit, Parse-Fehler, Netzwerkfehler)
    - Prüfen: console.error wird mit Song-ID und Fehlerdetails aufgerufen; benutzerfreundliche Meldung wird zurückgegeben
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [x] 3. Checkpoint – Kernlogik validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. API-Route implementieren
  - [x] 4.1 POST- und GET-Handler in `src/app/api/songs/[id]/translate/route.ts` erstellen
    - POST-Handler: Auth-Check via `auth()` → 401, optionalen `zielsprache`-Parameter aus Request-Body lesen, `translateSong(userId, id, zielsprache)` aufrufen, Erfolg → 200 mit `UebersetzungResult`, Fehler-Mapping → 400/403/404/409/429/500
    - GET-Handler: Auth-Check via `auth()` → 401, `getTranslation(userId, id)` aufrufen, Erfolg → 200 mit Ergebnis oder `null`, Fehler-Mapping → 403/404/500
    - Bestehende API-Route-Muster aus `src/app/api/songs/[id]/analyze/route.ts` übernehmen
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 4.2 Property-Test: Zugriffskontrolle
    - Datei: `__tests__/translation/access-control.property.test.ts`
    - Auth-Mock und Ownership-Szenarien generieren
    - Prüfen: Unauthentifiziert → 401, fremder Song → 403, eigener Song → Zugriff gewährt
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 4.3 Property-Test: 404 bei nicht-existierender Song-ID
    - Datei: `__tests__/translation/not-found.property.test.ts`
    - Zufällige nicht-existierende Song-IDs generieren
    - Prüfen: POST und GET geben 404 zurück
    - **Validates: Requirements 4.7**

  - [ ]* 4.4 Property-Test: Zielsprache-Validierung
    - Datei: `__tests__/translation/target-language.property.test.ts`
    - Generieren: leere Strings, undefined, gültige Sprachstrings
    - Prüfen: Leerer String → 400, undefined → Default „Deutsch" wird verwendet, gültiger String → wird an Prompt übergeben
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 5. Integration und Wiring
  - [x] 5.1 Sicherstellen, dass die bestehende Song-Detail-API die Übersetzungen mitliefert
    - Prüfen, dass die GET-Route `/api/songs/[id]` das Feld `uebersetzung` der Zeilen bereits inkludiert
    - Falls nötig, Prisma-Include anpassen, damit `uebersetzung` im Response enthalten ist
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.2 Unit-Test: Integration mit bestehendem Datenmodell
    - Datei: `__tests__/translation/integration.test.ts`
    - Prüfen: Nach Übersetzung liefert die Song-Detail-API die Übersetzungen im Feld `uebersetzung` der Zeilen
    - Prüfen: Bestehende Übersetzungen werden bei Neuübersetzung überschrieben
    - _Requirements: 1.5, 6.1, 6.2, 6.3_

- [x] 6. Final-Checkpoint – Alle Tests und Integration validieren
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Der bestehende LLM-Client (`src/lib/services/llm-client.ts`) wird unverändert wiederverwendet
- Keine Prisma-Schema-Änderungen nötig – das Feld `uebersetzung` am Zeile-Modell existiert bereits
- Der LLM-Client wird in Tests immer gemockt (keine echten API-Aufrufe)
- Das Muster des `analyse-service.ts` dient als Referenz für die Implementierung
