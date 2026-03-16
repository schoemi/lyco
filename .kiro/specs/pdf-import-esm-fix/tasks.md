# Implementierungsplan

- [x] 1. Bug-Condition-Explorationstest schreiben
  - **Property 1: Bug Condition** — ESM-Default-Import schlägt fehl
  - **WICHTIG**: Diesen Property-Based Test VOR der Implementierung des Fixes schreiben
  - **KRITISCH**: Dieser Test MUSS auf ungefixtem Code FEHLSCHLAGEN — das Fehlschlagen bestätigt, dass der Bug existiert
  - **NICHT versuchen, den Test oder den Code zu reparieren, wenn er fehlschlägt**
  - **HINWEIS**: Dieser Test kodiert das erwartete Verhalten — er validiert den Fix, wenn er nach der Implementierung besteht
  - **ZIEL**: Gegenbeispiele aufdecken, die den Bug demonstrieren
  - **Scoped-PBT-Ansatz**: Für diesen deterministischen Bug die Property auf den konkreten Fehlerfall einschränken: authentifizierter Nutzer mit gültiger PDF-Datei, wobei `pdf-parse` über Default-Import aufgerufen wird
  - Testdatei: `__tests__/songs/pdf-import-esm-bugcondition.property.test.ts`
  - Test prüft: Für eine gültige PDF-Datei eines authentifizierten Nutzers soll die Route den PDF-Text erfolgreich extrahieren und als JSON `{ titel, kuenstler, text }` zurückgeben (aus Bug Condition und Expected Behavior im Design)
  - Mock von `pdf-parse` so konfigurieren, dass er den aktuellen Default-Import-Stil (`{ default: fn }`) widerspiegelt
  - Test auf UNGEFIXTEM Code ausführen — erwartetes Ergebnis: Test SCHLÄGT FEHL (bestätigt den Bug)
  - Gegenbeispiele dokumentieren (z.B. "Mock greift nicht korrekt, da Default-Export-Struktur nicht zum Import-Stil passt")
  - Task als abgeschlossen markieren, wenn Test geschrieben, ausgeführt und Fehlschlag dokumentiert ist
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Preservation-Property-Tests schreiben (VOR Implementierung des Fixes)
  - **Property 2: Preservation** — Validierungen und Fehlerbehandlung bleiben unverändert
  - **WICHTIG**: Observation-First-Methodik befolgen
  - Testdatei: `__tests__/songs/pdf-import-esm-preservation.property.test.ts`
  - Beobachten: Verhalten auf UNGEFIXTEM Code für Nicht-Bug-Condition-Fälle (alle Anfragen, die nicht den PDF-Parsing-Pfad erreichen)
  - Beobachten: Nicht-authentifizierte Anfrage → Status 401, `{ error: "Nicht authentifiziert" }`
  - Beobachten: Fehlende Datei im FormData → Status 400, `{ error: "Keine Datei hochgeladen" }`
  - Beobachten: Nicht-PDF-Datei → Status 400, Fehlermeldung enthält "PDF"
  - Beobachten: Datei > 5MB → Status 400, `{ error: "Datei darf maximal 5MB groß sein" }`
  - Beobachten: PDF ohne extrahierbaren Text → Status 400, `{ error: "PDF enthält keinen extrahierbaren Text" }`
  - Beobachten: Ungültige LLM-Antwort → Status 500 mit entsprechender Fehlermeldung
  - Property-Based Test mit `fast-check` schreiben: Für alle zufällig generierten Eingaben, bei denen die Bug Condition NICHT zutrifft (fehlende Auth, fehlende Datei, falscher Dateityp, zu große Datei, leerer PDF-Text, LLM-Fehler), soll die Route exakt dieselben Statuscodes und Fehlermeldungen zurückgeben
  - Arbitraries für Dateigröße (> 5MB), Dateityp (nicht-PDF), und LLM-Antworten (ungültiges JSON, fehlendes Format) generieren
  - Tests auf UNGEFIXTEM Code ausführen — erwartetes Ergebnis: Tests BESTEHEN (bestätigt Baseline-Verhalten)
  - Task als abgeschlossen markieren, wenn Tests geschrieben, ausgeführt und auf ungefixtem Code bestanden
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix für ESM-Default-Import von pdf-parse

  - [x] 3.1 Fix implementieren
    - In `src/app/api/songs/parse-pdf/route.ts`: `import pdf from "pdf-parse"` ersetzen durch `import * as pdfParse from "pdf-parse"`
    - Aufruf `pdf(buffer)` ersetzen durch `pdfParse.default(buffer)` (oder `pdfParse(buffer)` falls callable — beim Implementieren prüfen)
    - In `__tests__/songs/parse-pdf-api.test.ts`: Mock von `vi.mock("pdf-parse", () => ({ default: fn }))` anpassen, sodass er zum neuen Namespace-Import-Stil passt
    - _Bug_Condition: isBugCondition(input) wobei input.importStatement = "import pdf from 'pdf-parse'" AND bundler = "turbopack"_
    - _Expected_Behavior: Build läuft fehlerfrei, pdf-parse wird korrekt aufgerufen, JSON-Antwort { titel, kuenstler, text } wird zurückgegeben_
    - _Preservation: Alle Validierungen (Auth 401, fehlende Datei 400, falscher Typ 400, Größe 400, leerer Text 400, LLM-Fehler 500) bleiben identisch_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Bug-Condition-Explorationstest besteht jetzt
    - **Property 1: Expected Behavior** — ESM-kompatibler Import ermöglicht PDF-Parsing
    - **WICHTIG**: Denselben Test aus Task 1 erneut ausführen — KEINEN neuen Test schreiben
    - Der Test aus Task 1 kodiert das erwartete Verhalten
    - Wenn dieser Test besteht, bestätigt er, dass das erwartete Verhalten erfüllt ist
    - Bug-Condition-Explorationstest aus Schritt 1 ausführen
    - **Erwartetes Ergebnis**: Test BESTEHT (bestätigt, dass der Bug behoben ist)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Preservation-Tests bestehen weiterhin
    - **Property 2: Preservation** — Validierungen und Fehlerbehandlung bleiben unverändert
    - **WICHTIG**: Dieselben Tests aus Task 2 erneut ausführen — KEINE neuen Tests schreiben
    - Preservation-Property-Tests aus Schritt 2 ausführen
    - **Erwartetes Ergebnis**: Tests BESTEHEN (bestätigt keine Regressionen)
    - Bestätigen, dass alle Tests nach dem Fix weiterhin bestehen (keine Regressionen)

- [x] 4. Checkpoint — Sicherstellen, dass alle Tests bestehen
  - Alle Tests ausführen (`vitest --run`)
  - Bestehenden Test `__tests__/songs/parse-pdf-api.test.ts` mit angepasstem Mock verifizieren
  - Sicherstellen, dass alle Tests bestehen; bei Fragen den Nutzer konsultieren
