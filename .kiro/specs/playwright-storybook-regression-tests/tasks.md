# Implementation Plan: Playwright & Storybook Regressionstests

## Overview

Aufbau der Regressionstestinfrastruktur in zwei Teststufen: Storybook Test Runner (komponentenbasiert, axe-core) und Playwright E2E-Tests (flow-basiert, axe-playwright). Beide Stufen werden in GitHub Actions integriert. Die bestehende Infrastruktur (`e2e/smoke.spec.ts`, `@storybook/test-runner`, `axe-playwright`, `playwright.config.ts`) wird erweitert, nicht ersetzt.

## Tasks

- [x] 1. Storybook Test Runner konfigurieren
  - [x] 1.1 `.storybook/test-runner.ts` erstellen mit axe-core-Integration
    - `TestRunnerConfig` aus `@storybook/test-runner` importieren
    - `preVisit`-Hook: `injectAxe(page)` aus `axe-playwright` aufrufen
    - `postVisit`-Hook: `checkA11y(page, "#storybook-root", ...)` mit `includedImpacts: ["critical", "serious"]` und WCAG-Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
    - `detailedReport: true` und `detailedReportOptions: { html: true }` setzen
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.2 Smoke-Test: Konfigurationsdatei vorhanden und korrekt exportiert
    - Prüfen, dass `.storybook/test-runner.ts` eine gültige `TestRunnerConfig` als Default-Export enthält
    - _Requirements: 2.3_

- [x] 2. Play-Funktionen für Cloze-Stories hinzufügen
  - [x] 2.1 Play-Funktion in `gap-input.stories.tsx` ergänzen
    - Neue Story `WithInteraction` hinzufügen
    - `userEvent`, `within`, `expect` aus `@storybook/test` importieren
    - `play`-Funktion: `userEvent.type(input, "hello")` → `expect(input).toHaveValue("hello")`
    - Args: `gapId: "g1"`, `targetWord: "hello"`, `value: ""`, `feedback: null`, `hintActive: false`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.2 Play-Funktion in `hint-button.stories.tsx` ergänzen
    - Neue Story `ClickEnabled` hinzufügen
    - `play`-Funktion: Klick auf den Button → `expect(args.onClick).toHaveBeenCalledOnce()`
    - `fn()` aus `storybook/test` ist bereits in `meta.args` vorhanden
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.3 Smoke-Test: Play-Funktionen in Cloze-Stories vorhanden
    - Prüfen, dass `WithInteraction` in `gap-input.stories.tsx` eine `play`-Funktion hat
    - Prüfen, dass `ClickEnabled` in `hint-button.stories.tsx` eine `play`-Funktion hat
    - _Requirements: 6.1_

- [x] 3. Play-Funktionen für Karaoke-Stories hinzufügen
  - [x] 3.1 Play-Funktion in `play-pause-button.stories.tsx` ergänzen
    - Neue Story `TogglePlay` hinzufügen
    - `play`-Funktion: Klick auf den Button → `expect(args.onToggle).toHaveBeenCalledOnce()`
    - Args: `isPlaying: false`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.2 Play-Funktion in `modus-umschalter.stories.tsx` ergänzen
    - Neue Story `SwitchMode` hinzufügen
    - `play`-Funktion: Klick auf einen anderen Modus-Button → `expect(args.onChange).toHaveBeenCalledOnce()`
    - Args: `activeMode: "einzelzeile"`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.3 Smoke-Test: Play-Funktionen in Karaoke-Stories vorhanden
    - Prüfen, dass `TogglePlay` in `play-pause-button.stories.tsx` eine `play`-Funktion hat
    - Prüfen, dass `SwitchMode` in `modus-umschalter.stories.tsx` eine `play`-Funktion hat
    - _Requirements: 6.1_

- [x] 4. Play-Funktionen für Quiz-Stories hinzufügen
  - [x] 4.1 Play-Funktion in `multiple-choice-card.stories.tsx` ergänzen
    - Neue Story `SelectAnswer` hinzufügen
    - `play`-Funktion: Klick auf die erste Antwortoption → `expect(args.onAnswer).toHaveBeenCalledOnce()`
    - Args: Bestehende `Default`-Args wiederverwenden
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.2 Play-Funktion in `score-screen.stories.tsx` ergänzen
    - Neue Story `ClickRepeat` hinzufügen
    - `play`-Funktion: Klick auf den Wiederholen-Button → `expect(args.onRepeat).toHaveBeenCalledOnce()`
    - Args: `correct: 8`, `total: 10`, `songId: "song-1"`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.3 Smoke-Test: Play-Funktionen in Quiz-Stories vorhanden
    - Prüfen, dass `SelectAnswer` in `multiple-choice-card.stories.tsx` eine `play`-Funktion hat
    - Prüfen, dass `ClickRepeat` in `score-screen.stories.tsx` eine `play`-Funktion hat
    - _Requirements: 6.1_

- [x] 5. Checkpoint – Play-Funktionen vollständig
  - Sicherstellen, dass alle 6 Play-Funktionen in den Stories vorhanden sind. Bei Fragen den Nutzer ansprechen.

- [x] 6. Playwright E2E-Regressionstests erstellen
  - [x] 6.1 Verzeichnis `e2e/regression/` anlegen und `login.spec.ts` erstellen
    - `test.describe("Login-Flow Regression")` mit mindestens 2 Tests:
      - Erfolgreicher Login: `page.goto("/login")` → Credentials aus `process.env.TEST_USER` / `process.env.TEST_PASSWORD` → Klick auf Login-Button → `expect(page).not.toHaveURL(/\/login/)`
      - Fehlgeschlagener Login: Falsche Credentials → Fehlermeldung sichtbar
    - `import { test, expect } from "@playwright/test"` verwenden
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [x] 6.2 `e2e/regression/songs.spec.ts` erstellen
    - `test.describe("Song-Listenansicht Regression")` mit mindestens 2 Tests:
      - Seite lädt: `page.goto("/songs")` → Seitentitel oder Überschrift sichtbar
      - Songs werden angezeigt: Mindestens ein Song-Element im DOM vorhanden
    - Login-State über `test.use({ storageState: ... })` oder direkten Login im `beforeEach` herstellen
    - _Requirements: 3.2, 3.4, 3.5, 3.6_

  - [x] 6.3 `e2e/regression/navigation.spec.ts` erstellen
    - `test.describe("Navigation Regression")` mit mindestens 3 Tests:
      - Navigation zu `/login` → Seite lädt korrekt
      - Navigation zu `/` → Startseite lädt korrekt
      - Navigation zu `/songs` → Songs-Seite lädt korrekt (oder Redirect auf Login)
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [x] 6.4 Smoke-Test: Regressionstests-Verzeichnis und Dateien vorhanden
    - Prüfen, dass `e2e/regression/login.spec.ts`, `songs.spec.ts` und `navigation.spec.ts` existieren
    - _Requirements: 3.5_

- [x] 7. Playwright Barrierefreiheitstests erstellen
  - [x] 7.1 Verzeichnis `e2e/a11y/` anlegen und `pages.a11y.spec.ts` erstellen
    - `AxeBuilder` aus `@axe-core/playwright` importieren (re-exportiert von `axe-playwright`)
    - `test.describe("Barrierefreiheit – Seiten")` mit 3 Tests:
      - Login-Seite: `page.goto("/login")` → `waitForLoadState("networkidle")` → `AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()` → Violations mit `impact === "critical" || "serious"` filtern → `expect(violations).toEqual([])`
      - Startseite: analog für `"/"`
      - Song-Listenansicht: analog für `"/songs"` (nach Login oder öffentlich zugänglich)
    - **Property 3: Vollständiges Laden vor Barrierefreiheitsprüfung** – `waitForLoadState("networkidle")` vor jeder axe-Analyse
    - **Property 1: Barrierefreiheitsverstöße führen zu Testfehlern** – nur `critical`/`serious` als Fehler werten
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Smoke-Test: A11y-Testdatei vorhanden und korrekt strukturiert
    - Prüfen, dass `e2e/a11y/pages.a11y.spec.ts` existiert und `AxeBuilder` verwendet
    - _Requirements: 4.3_

- [x] 8. Checkpoint – E2E-Tests vollständig
  - Sicherstellen, dass alle Regressions- und A11y-Tests vorhanden sind. Bei Fragen den Nutzer ansprechen.

- [x] 9. `playwright.config.ts` erweitern
  - [x] 9.1 Reporter-Konfiguration auf Array-Format umstellen
    - Bestehenden `reporter`-Eintrag ersetzen:
      ```typescript
      reporter: process.env.CI
        ? [["github"], ["junit", { outputFile: "e2e/test-results/results.xml" }]]
        : [["html", { outputFolder: "e2e/playwright-report" }]],
      ```
    - Bestehende `use`-Konfiguration (`baseURL`, `screenshot`, `trace`) unverändert lassen
    - _Requirements: 5.4, 7.1_

  - [x] 9.2 Smoke-Test: Reporter-Konfiguration korrekt
    - Prüfen, dass `playwright.config.ts` im CI-Modus JUnit-Reporter enthält
    - _Requirements: 5.4_

- [x] 10. npm Scripts in `package.json` anpassen
  - [x] 10.1 `test:stories:ci`-Script um `--junit`-Flag ergänzen
    - Bestehenden Wert ersetzen:
      ```
      "test:stories:ci": "storybook build -o storybook-static && npx -y http-server storybook-static -p 6006 --silent & npx -y wait-on tcp:6006 && npm run test:stories -- --url http://localhost:6006 --junit"
      ```
    - Bestehende Scripts `test:stories`, `test:e2e`, `test:e2e:ui` unverändert lassen
    - _Requirements: 1.6, 7.4_

  - [x] 10.2 Smoke-Test: npm Scripts vorhanden
    - Prüfen, dass `test:stories`, `test:stories:ci`, `test:e2e` und `test:e2e:ui` in `package.json` definiert sind
    - Prüfen, dass `test:stories:ci` das `--junit`-Flag enthält
    - _Requirements: 1.5, 1.6_

- [x] 11. GitHub Actions Workflow erstellen
  - [x] 11.1 `.github/workflows/regression-tests.yml` erstellen
    - Trigger: `push` auf `main` und `pull_request` auf `main`
    - Job `storybook-tests`:
      - `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, npm cache)
      - `npm ci`
      - `npm run test:stories:ci`
      - Artefakt-Upload: `storybook-test-results/`, 7 Tage Aufbewahrung, `if: always()`
    - Job `playwright-tests`:
      - `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, npm cache)
      - `npm ci`
      - `npx playwright install --with-deps chromium`
      - `npm run test:e2e` mit Env-Vars `TEST_USER` und `TEST_PASSWORD` aus GitHub Secrets
      - Artefakt-Upload: `e2e/playwright-report/` und `e2e/test-results/`, 7 Tage, `if: always()`
      - Job-Summary: `echo "## Playwright Testergebnisse" >> $GITHUB_STEP_SUMMARY`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.2_

  - [x] 11.2 Smoke-Test: Workflow-Datei vorhanden und korrekt strukturiert
    - Prüfen, dass `.github/workflows/regression-tests.yml` existiert
    - Prüfen, dass beide Jobs (`storybook-tests`, `playwright-tests`) definiert sind
    - _Requirements: 5.7_

- [x] 12. README.md in `e2e/` erstellen
  - [x] 12.1 `e2e/README.md` mit Testinfrastruktur-Dokumentation erstellen
    - Abschnitte:
      - **Teststruktur**: Übersicht der Verzeichnisse (`smoke.spec.ts`, `regression/`, `a11y/`)
      - **Voraussetzungen**: Node.js, Playwright-Installation, laufende Next.js-App
      - **Verfügbare Befehle**: `npm run test:e2e`, `npm run test:e2e:ui`, `npx playwright show-report e2e/playwright-report`
      - **Umgebungsvariablen**: `TEST_USER`, `TEST_PASSWORD`, `PLAYWRIGHT_BASE_URL`
      - **CI/CD**: Hinweis auf `.github/workflows/regression-tests.yml`
    - _Requirements: 7.3_

- [x] 13. Abschluss-Checkpoint – Gesamte Infrastruktur vollständig
  - Sicherstellen, dass alle Dateien erstellt wurden und alle Tests lokal ausführbar sind. Bei Fragen den Nutzer ansprechen.

## Notes

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Requirements für Rückverfolgbarkeit
- Die bestehende `e2e/smoke.spec.ts` wird nicht verändert
- Play-Funktionen verwenden ausschließlich `userEvent` und `expect` aus `@storybook/test` (kein externes Framework)
- **Property 1** (Barrierefreiheitsverstöße → Testfehler): Implementiert durch `includedImpacts: ["critical", "serious"]` in Aufgabe 1.1 und Impact-Filter in Aufgabe 7.1
- **Property 2** (Play-Funktionen prüfen Zustand): Implementiert durch Play-Funktionen in Aufgaben 2.1, 2.2, 3.1, 3.2, 4.1, 4.2
- **Property 3** (Vollständiges Laden vor A11y-Prüfung): Implementiert durch `waitForLoadState("networkidle")` in Aufgabe 7.1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2"] },
    { "id": 1, "tasks": ["1.2", "2.3", "3.3", "4.3", "6.1", "6.2", "6.3", "7.1", "9.1", "10.1"] },
    { "id": 2, "tasks": ["6.4", "7.2", "9.2", "10.2", "11.1", "12.1"] },
    { "id": 3, "tasks": ["11.2"] }
  ]
}
```
