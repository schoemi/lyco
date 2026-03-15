# Implementierungsplan: Storybook-Integration

## Übersicht

Schrittweise Integration von Storybook 8 in das Lyco-Projekt. Jeder Task baut auf dem vorherigen auf: zuerst Abhängigkeiten und Konfiguration, dann Stories und Dokumentation, abschließend Git-Konfiguration und Validierung.

## Tasks

- [x] 1. Storybook-Abhängigkeiten installieren und Basiskonfiguration erstellen
  - [x] 1.1 Storybook-Pakete als devDependencies installieren
    - `storybook`, `@storybook/nextjs`, `@storybook/react`, `@storybook/addon-essentials`, `@storybook/addon-a11y`, `@storybook/addon-interactions`, `@storybook/test` als devDependencies hinzufügen
    - _Requirements: 1.1, 1.5, 4.1, 4.2, 4.3_

  - [x] 1.2 `.storybook/main.ts` erstellen
    - Konfiguration mit `@storybook/nextjs` Framework-Adapter
    - Stories-Glob: `["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"]`
    - Addons: `@storybook/addon-essentials`, `@storybook/addon-a11y`, `@storybook/addon-interactions`
    - `staticDirs: ["../public"]`
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3_

  - [x] 1.3 `.storybook/preview.ts` erstellen
    - Import von `../src/app/globals.css` für Tailwind CSS 4
    - Controls-Matchers für Color und Date konfigurieren
    - _Requirements: 1.4, 3.1, 3.2, 3.3_

  - [x] 1.4 NPM-Scripts in `package.json` hinzufügen
    - `"storybook": "storybook dev -p 6006"`
    - `"build-storybook": "storybook build"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Checkpoint – Basiskonfiguration prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Beispiel-Stories für bestehende Komponenten erstellen
  - [x] 3.1 ScorePill Story erstellen (`src/components/cloze/score-pill.stories.tsx`)
    - Meta mit `title: "Cloze/ScorePill"`, `tags: ["autodocs"]`
    - Stories: Default (7/10), Perfect (10/10), Zero (0/10)
    - _Requirements: 5.1, 5.4_

  - [x] 3.2 DifficultySelector Story erstellen (`src/components/cloze/difficulty-selector.stories.tsx`)
    - Meta mit `title: "Cloze/DifficultySelector"`, `tags: ["autodocs"]`
    - Stories: Leicht, Mittel, Schwer, Blind – je eine Story pro Schwierigkeitsstufe
    - _Requirements: 5.2, 5.4_

  - [x] 3.3 ProgressBar Story erstellen (`src/components/songs/progress-bar.stories.tsx`)
    - Meta mit `title: "Songs/ProgressBar"`, `tags: ["autodocs"]`
    - Stories: Empty (0), Half (50), Full (100), Overflow (150)
    - _Requirements: 5.3, 5.4_

- [x] 4. Introduction-Dokumentationsseite erstellen
  - [x] 4.1 `src/stories/Introduction.mdx` erstellen
    - Dateinamenskonvention beschreiben: `<component-name>.stories.tsx` neben der Komponente
    - Empfohlene Ordnerstruktur beschreiben: Co-Location im gleichen Verzeichnis
    - Beispiel einer typischen Story-Datei einfügen
    - Hinweis auf `tags: ["autodocs"]` für automatische Dokumentation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5. Git-Konfiguration anpassen
  - [x] 5.1 `storybook-static/` zur `.gitignore` hinzufügen
    - Eintrag am Ende der Datei unter einem neuen `# storybook`-Kommentar
    - _Requirements: 7.1_

- [x] 6. Final-Checkpoint – Alle Dateien und Konfiguration validieren
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` markiert sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachvollziehbarkeit
- Checkpoints stellen inkrementelle Validierung sicher
- Die Implementierungssprache ist TypeScript, wie im Design-Dokument festgelegt
