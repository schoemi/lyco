# Requirements Document

## Introduction

Aufbau einer systematischen Regressionstestinfrastruktur für die Lyco Next.js-Anwendung. Die Infrastruktur kombiniert zwei Teststufen: Playwright für End-to-End-Regressionstests kritischer User-Flows sowie den Storybook Test Runner für komponentenbasierte Regressionstests. Ziel ist es, Regressionen frühzeitig zu erkennen, die Testabdeckung transparent zu machen und die Testausführung in CI/CD zu integrieren.

Das Projekt verfügt bereits über:

- Eine bestehende `e2e/smoke.spec.ts` mit grundlegenden Playwright-Smoke-Tests
- 54 Storybook-Stories in `src/components/**/*.stories.tsx`
- `@storybook/test-runner` als installierte Abhängigkeit
- `axe-playwright` für Barrierefreiheitstests

## Glossary

- **Regressions_Test_Suite**: Die Gesamtheit aller automatisierten Tests, die sicherstellen, dass bestehende Funktionalität nach Änderungen weiterhin korrekt funktioniert
- **E2E_Test_Runner**: Playwright-Instanz, die vollständige User-Flows gegen die laufende Next.js-Anwendung ausführt
- **Story_Test_Runner**: `@storybook/test-runner` Instanz, die alle Storybook-Stories als Regressionstests ausführt
- **Story**: Eine Storybook-Datei (`*.stories.tsx`), die eine Komponente in einem definierten Zustand darstellt
- **Play_Funktion**: Eine in einer Story definierte Interaktionssequenz, die Benutzerinteraktionen simuliert und Assertions enthält
- **Barrierefreiheits_Pruefung**: Automatisierte Prüfung einer Komponente oder Seite gegen WCAG-Richtlinien mittels axe-core
- **CI_Pipeline**: GitHub Actions Workflow, der Tests automatisch bei Pull Requests und Pushes ausführt
- **Smoke_Test**: Minimaler Test, der prüft, ob eine Seite oder Komponente grundsätzlich erreichbar und renderbar ist
- **Regressions_Bericht**: Strukturierter Testbericht, der Testergebnisse, Fehler und Abdeckungsmetriken enthält
- **Komponenten_Kategorie**: Gruppierung von Komponenten nach Funktionsbereich (z.B. karaoke, cloze, quiz, admin)

## Requirements

### Requirement 1: Storybook Story-Regressionstests

**User Story:** Als Entwickler möchte ich, dass alle bestehenden Storybook-Stories automatisch als Regressionstests ausgeführt werden, damit ich Rendering-Regressionen in Komponenten sofort erkenne.

#### Acceptance Criteria

1. THE Story_Test_Runner SHALL alle `*.stories.tsx`-Dateien in `src/components/**` automatisch als Tests erkennen und ausführen
2. WHEN eine Story gerendert wird, THE Story_Test_Runner SHALL prüfen, dass die Komponente ohne JavaScript-Fehler in der Konsole rendert
3. WHEN eine Story eine `play`-Funktion enthält, THE Story_Test_Runner SHALL die Play-Funktion ausführen und alle darin enthaltenen Assertions prüfen
4. IF eine Story einen Render-Fehler wirft, THEN THE Story_Test_Runner SHALL den Test unabhängig vom Erfolg der Fehlerausgabe als fehlgeschlagen markieren und den Fehler mit Komponenten-Name und Story-Name ausgeben
5. THE Story_Test_Runner SHALL über den Befehl `npm run test:stories` ausführbar sein, wenn Storybook bereits auf Port 6006 läuft
6. THE Story_Test_Runner SHALL über den Befehl `npm run test:stories:ci` ausführbar sein, ohne dass Storybook vorher manuell gestartet werden muss

### Requirement 2: Barrierefreiheitstests für Storybook-Komponenten

**User Story:** Als Entwickler möchte ich, dass jede Storybook-Story automatisch auf Barrierefreiheitsverstöße geprüft wird, damit WCAG-Regressionen frühzeitig erkannt werden.

#### Acceptance Criteria

1. WHEN der Story_Test_Runner eine Story ausführt, THE Story_Test_Runner SHALL eine axe-core-Barrierefreiheitsprüfung für jede Story durchführen
2. IF eine Story einen axe-core-Verstoß der Schwere `critical` oder `serious` enthält, THEN THE Story_Test_Runner SHALL den Test als fehlgeschlagen markieren und den Verstoß mit Regel-ID, Beschreibung und betroffenen DOM-Elementen ausgeben
3. THE Story_Test_Runner SHALL Barrierefreiheitsprüfungen über eine zentrale Konfiguration in `.storybook/` aktivieren, sodass keine Änderungen an einzelnen Story-Dateien erforderlich sind
4. WHERE eine Story explizit Barrierefreiheitsprüfungen für bestimmte Regeln deaktiviert, THE Story_Test_Runner SHALL diese Ausnahmen respektieren und Verstöße für ausgenommene Regeln weiterhin erkennen und im Bericht ausgeben, ohne den Test zu blockieren

### Requirement 3: Playwright E2E-Regressionstests für kritische User-Flows

**User Story:** Als Entwickler möchte ich automatisierte E2E-Regressionstests für die wichtigsten User-Flows der Anwendung, damit ich Regressionen in vollständigen Abläufen erkennen kann.

#### Acceptance Criteria

1. THE E2E_Test_Runner SHALL Regressionstests für den Login-Flow (Eingabe von Benutzername und Passwort, erfolgreiche Weiterleitung) ausführen
2. THE E2E_Test_Runner SHALL Regressionstests für die Song-Listenansicht (Laden der Seite, Anzeige von Songs) ausführen
3. THE E2E_Test_Runner SHALL Regressionstests für die Navigation zwischen Hauptbereichen der Anwendung ausführen
4. WHEN ein E2E-Test fehlschlägt, THE E2E_Test_Runner SHALL einen Screenshot des Fehlerzustands in `e2e/test-results/` speichern und bei einem Fehler beim Speichern des Screenshots die verbleibenden Tests weiterhin ausführen
5. THE E2E_Test_Runner SHALL alle Regressionstests in einem dedizierten Verzeichnis `e2e/regression/` organisieren, getrennt von den bestehenden Smoke-Tests
6. WHEN ein E2E-Regressionstest ausgeführt wird, THE E2E_Test_Runner SHALL einen Trace bei Fehlern in `e2e/test-results/` speichern, um die Fehleranalyse zu erleichtern

### Requirement 4: Playwright Barrierefreiheitstests für Seiten

**User Story:** Als Entwickler möchte ich automatisierte Barrierefreiheitstests für die wichtigsten Seiten der Anwendung, damit WCAG-Verstöße auf Seitenebene erkannt werden.

#### Acceptance Criteria

1. THE E2E_Test_Runner SHALL axe-playwright-Barrierefreiheitsprüfungen für die Login-Seite, die Startseite und die Song-Listenansicht ausführen
2. IF eine Seite einen axe-core-Verstoß der Schwere `critical` oder `serious` enthält, THEN THE E2E_Test_Runner SHALL den Test als fehlgeschlagen markieren und den Verstoß mit Regel-ID und betroffenen Elementen ausgeben
3. THE E2E_Test_Runner SHALL Barrierefreiheitstests in einem dedizierten Verzeichnis `e2e/a11y/` organisieren
4. WHEN ein Barrierefreiheitstest ausgeführt wird, THE E2E_Test_Runner SHALL die Prüfung nach dem vollständigen Laden der Seite durchführen

### Requirement 5: CI/CD-Integration

**User Story:** Als Entwickler möchte ich, dass alle Regressionstests automatisch in der CI/CD-Pipeline ausgeführt werden, damit Regressionen vor dem Merge erkannt werden.

#### Acceptance Criteria

1. THE CI_Pipeline SHALL alle Storybook-Regressionstests (`npm run test:stories:ci`) bei jedem Pull Request und Push auf den `main`-Branch ausführen
2. THE CI_Pipeline SHALL alle Playwright-E2E-Regressionstests (`npm run test:e2e`) bei jedem Pull Request und Push auf den `main`-Branch ausführen
3. IF ein Test in der CI_Pipeline fehlschlägt, THEN THE CI_Pipeline SHALL den Build als fehlgeschlagen markieren und den Merge blockieren, wobei Testfehler stets sowohl den Build-Status als fehlgeschlagen setzen als auch den Merge blockieren müssen
4. THE CI_Pipeline SHALL Playwright-Testergebnisse und Screenshots als Build-Artefakte für 7 Tage aufbewahren
5. THE CI_Pipeline SHALL Storybook-Testergebnisse als Build-Artefakte für 7 Tage aufbewahren
6. WHEN die CI_Pipeline Playwright-Tests ausführt, THE CI_Pipeline SHALL die Next.js-Anwendung vor den Tests bauen und starten, wobei der Start der Anwendung verhindert wird, wenn der Build-Schritt fehlschlägt
7. THE CI_Pipeline SHALL die Tests in einem GitHub Actions Workflow in `.github/workflows/` definieren

### Requirement 6: Play-Funktionen für bestehende Stories

**User Story:** Als Entwickler möchte ich, dass die wichtigsten bestehenden Storybook-Stories Play-Funktionen mit Interaktions- und Zustandsassertions erhalten, damit Komponentenverhalten automatisch geprüft wird.

#### Acceptance Criteria

1. THE Story_Test_Runner SHALL Play-Funktionen in Stories der Komponenten-Kategorien `cloze`, `karaoke` und `quiz` ausführen und die darin enthaltenen Assertions prüfen
2. WHEN eine Play-Funktion eine Benutzerinteraktion simuliert (z.B. Klick, Texteingabe), THE Story_Test_Runner SHALL den resultierenden Zustand der Komponente gegen definierte Assertions prüfen
3. THE Story_Test_Runner SHALL sicherstellen, dass Play-Funktionen mit `@storybook/test` (userEvent, expect) implementiert sind und keine externen Test-Frameworks erfordern
4. IF eine Play-Funktion eine Assertion verletzt, THEN THE Story_Test_Runner SHALL den Fehler mit dem Namen der Story und der fehlgeschlagenen Assertion ausgeben

### Requirement 7: Testberichte und Dokumentation

**User Story:** Als Entwickler möchte ich strukturierte Testberichte und eine Dokumentation der Testinfrastruktur, damit ich den Teststatus und die Abdeckung nachvollziehen kann.

#### Acceptance Criteria

1. THE E2E_Test_Runner SHALL nach jeder lokalen Testausführung einen HTML-Bericht in `e2e/playwright-report/` generieren, der über `npx playwright show-report` aufrufbar ist
2. THE CI_Pipeline SHALL im GitHub Actions Workflow eine Zusammenfassung der Testergebnisse als Job-Summary ausgeben, wobei ein Fehler bei der Generierung der Zusammenfassung den Build nicht als fehlgeschlagen markiert, wenn die Tests selbst erfolgreich waren
3. THE Regressions_Test_Suite SHALL eine `README.md` in `e2e/` enthalten, die die Teststruktur, verfügbare Befehle und Voraussetzungen für die lokale Ausführung dokumentiert
4. WHEN der Story_Test_Runner im CI-Modus ausgeführt wird, THE Story_Test_Runner SHALL Testergebnisse im JUnit-XML-Format ausgeben, das von GitHub Actions verarbeitet werden kann
