# Implementierungsplan: Smarte Song-Analyse

## Übersicht

Inkrementelle Implementierung der LLM-basierten Song-Analyse für Lyco. Beginnt mit dem Datenmodell, dann LLM-Client, Analyse-Service mit Prompt-Builder und Validierung, API-Route und abschließend Wiring und Tests. Alle Komponenten werden in TypeScript implementiert und folgen den bestehenden Projektmustern (Next.js App Router, Prisma, vitest, fast-check).

## Tasks

- [x] 1. Prisma-Schema erweitern und Typen anpassen
  - [x] 1.1 Analyse-Felder zum Prisma-Schema hinzufügen
    - `analyse String?` zum `Song`-Modell in `prisma/schema.prisma` hinzufügen
    - `analyse String?` zum `Strophe`-Modell in `prisma/schema.prisma` hinzufügen
    - Prisma-Migration erstellen und anwenden (`npx prisma migrate dev`)
    - Prisma-Client neu generieren
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 1.2 Analyse-Typen in `src/types/song.ts` definieren
    - `SongAnalyseResult`-Interface mit `songAnalyse`, `emotionsTags`, `strophenAnalysen` anlegen
    - `StropheAnalyseResult`-Interface mit `stropheId` und `analyse` anlegen
    - Bestehende Song/Strophe-Typen um optionales `analyse`-Feld erweitern (falls nötig)
    - _Requirements: 1.1, 1.3, 6.6_

- [x] 2. LLM-Client implementieren
  - [x] 2.1 LLM-Client in `src/lib/services/llm-client.ts` erstellen
    - `LLMClientConfig`-Interface definieren (apiKey, baseURL, model, timeoutMs, maxRetries)
    - `LLMMessage`-Interface definieren (role, content)
    - `createLLMClient()`-Funktion implementieren, die Konfiguration aus Umgebungsvariablen liest (`LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL`)
    - `chat(messages: LLMMessage[]): Promise<string>`-Funktion implementieren, die das `openai`-SDK mit `timeout: 30000` und `maxRetries: 2` verwendet
    - Fehler-Logging mit HTTP-Statuscode und Nachricht implementieren
    - Beschreibende Fehlermeldungen an den Aufrufer zurückgeben
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Analyse-Service implementieren
  - [x] 3.1 Prompt-Builder und Antwort-Validierung in `src/lib/services/analyse-service.ts` implementieren
    - `buildAnalysePrompt(song)`-Funktion: System-Prompt (Rolle als Songtext-Analyst, Fokus emotionale Bedeutung) und User-Prompt (Titel, Künstler, vollständiger Songtext mit Strophen-Markierungen, JSON-Antwortstruktur) zusammenstellen
    - `validateAnalyseResponse(raw, strophenCount)`-Funktion: JSON parsen, Schema validieren (songAnalyse: nicht-leerer String, emotionsTags: String-Array, strophenAnalysen: Array mit stropheIndex + analyse, Anzahl prüfen)
    - Leere Strophen (ohne Zeilen) beim Prompt-Aufbau überspringen
    - _Requirements: 3.1, 3.2, 3.3, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 3.2 Property-Test: Prompt-Vollständigkeit
    - **Property 1: Prompt-Vollständigkeit**
    - Datei: `__tests__/smart-analysis/prompt-completeness.property.test.ts`
    - Song-Generator mit fast-check (Titel, optionaler Künstler, 1-5 Strophen mit 1-10 Zeilen)
    - Prüfen: System-Nachricht enthält Rolle und emotionalen Fokus; User-Nachricht enthält Titel, Künstler (falls vorhanden), alle Zeilen aller Strophen, JSON-Anweisungen
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4**

  - [x] 3.3 Property-Test: Antwort-Validierung lehnt ungültiges JSON ab
    - **Property 2: Antwort-Validierung lehnt ungültiges JSON ab**
    - Datei: `__tests__/smart-analysis/response-validation.property.test.ts`
    - Invalid-JSON-Generator (kein JSON, fehlende Felder, falsche Typen, falsche Strophen-Anzahl)
    - Prüfen: Validierungsfunktion lehnt ab und gibt beschreibende Fehlermeldung zurück
    - **Validates: Requirements 6.5, 6.6**

  - [x] 3.4 `analyzeSong`-Funktion implementieren
    - Song mit Strophen und Zeilen via Prisma laden
    - Ownership-Check (userId === song.userId)
    - Prüfung ob Song Strophen mit Zeilen hat (sonst Fehler 400)
    - Concurrency-Guard: In-Memory-`Set<string>` mit aktiven Song-IDs, Prüfung vor Start, Freigabe im `finally`-Block
    - Prompt bauen, LLM-Client aufrufen, Antwort validieren
    - Song-Analyse und emotionsTags am Song speichern, Strophen-Analysen an jeweiligen Strophen speichern
    - Fehler-Mapping: Timeout, Rate-Limit (429), ungültiges JSON → benutzerfreundliche Meldungen
    - Fehler-Logging mit `console.error` im Format `[AnalyseService] Fehler bei Song {songId}: {fehlerTyp} - {details}`
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 4.1, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.5 `getAnalysis`-Funktion implementieren
    - Song mit Strophen via Prisma laden
    - Ownership-Check
    - Gespeicherte Song-Analyse, Strophen-Analysen und emotionsTags als `SongAnalyseResult` zurückgeben (oder `null`)
    - _Requirements: 5.4_

  - [x] 3.6 Property-Test: Analyse-Round-Trip
    - **Property 3: Analyse-Round-Trip**
    - Datei: `__tests__/smart-analysis/analysis-roundtrip.property.test.ts`
    - Song-Generator + LLM-Response-Generator (schema-konform, passend zur Strophen-Anzahl)
    - LLM-Client mocken, Prisma mocken
    - Prüfen: Ergebnis enthält songAnalyse (nicht-leer), emotionsTags (String-Array), strophenAnalysen (korrekte Anzahl, korrekte stropheId-Zuordnung)
    - **Validates: Requirements 3.4, 3.5, 4.1, 4.4, 5.2, 5.3, 6.6**

  - [x] 3.7 Property-Test: Concurrency-Guard
    - **Property 7: Concurrency-Guard**
    - Datei: `__tests__/smart-analysis/concurrency-guard.property.test.ts`
    - Prüfen: Gleichzeitige Analyse-Anfrage für denselben Song wird mit 409 und korrekter Meldung abgelehnt
    - **Validates: Requirements 7.4**

  - [x] 3.8 Property-Test: Fehler-Logging
    - **Property 8: Fehler-Logging**
    - Datei: `__tests__/smart-analysis/error-logging.property.test.ts`
    - Error-Generator (Timeout, Rate-Limit, Parse-Fehler, Netzwerkfehler)
    - Prüfen: console.error wird mit Zeitstempel-Format, Song-ID und Fehlerdetails aufgerufen; benutzerfreundliche Meldung wird zurückgegeben
    - **Validates: Requirements 2.4, 7.1, 7.2, 7.3, 7.5**

- [x] 4. Checkpoint – Kernlogik validieren
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. API-Route implementieren
  - [x] 5.1 POST- und GET-Handler in `src/app/api/songs/[id]/analyze/route.ts` erstellen
    - POST-Handler: Auth-Check via `auth()` → 401, `analyzeSong(userId, id)` aufrufen, Erfolg → 200 mit `SongAnalyseResult`, Fehler-Mapping → 400/403/404/409/429/500
    - GET-Handler: Auth-Check via `auth()` → 401, `getAnalysis(userId, id)` aufrufen, Erfolg → 200 mit Ergebnis oder `null`, Fehler-Mapping → 403/404/500
    - Bestehende API-Route-Muster aus `src/app/api/songs/[id]/route.ts` übernehmen
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 5.2 Property-Test: Zugriffskontrolle
    - **Property 5: Zugriffskontrolle**
    - Datei: `__tests__/smart-analysis/access-control.property.test.ts`
    - Auth-Mock und Ownership-Szenarien generieren
    - Prüfen: Unauthentifiziert → 401, fremder Song → 403, eigener Song → Zugriff gewährt
    - **Validates: Requirements 5.5, 5.6**

  - [x] 5.3 Property-Test: 404 bei nicht-existierender Song-ID
    - **Property 6: 404 bei nicht-existierender Song-ID**
    - Datei: `__tests__/smart-analysis/not-found.property.test.ts`
    - Zufällige nicht-existierende Song-IDs generieren
    - Prüfen: POST und GET geben 404 zurück
    - **Validates: Requirements 5.7**

  - [x] 5.4 Property-Test: Analyse-Überschreibung (Idempotenz)
    - **Property 4: Analyse-Überschreibung**
    - Datei: `__tests__/smart-analysis/analysis-overwrite.property.test.ts`
    - Zwei aufeinanderfolgende Analysen mit unterschiedlichen LLM-Antworten simulieren
    - Prüfen: Nur die zweite Analyse ist gespeichert, keine Reste der ersten
    - **Validates: Requirements 3.7, 4.6**

- [x] 6. Umgebungsvariablen konfigurieren
  - [x] 6.1 `.env.example` um LLM-Variablen erweitern
    - `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` mit Beschreibung hinzufügen
    - _Requirements: 2.1_

- [x] 7. Final-Checkpoint – Alle Tests und Integration validieren
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachverfolgbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Property-Tests validieren universelle Korrektheitseigenschaften aus dem Design
- Unit-Tests validieren spezifische Beispiele und Edge Cases
- Der LLM-Client wird in Tests immer gemockt (keine echten API-Aufrufe)
