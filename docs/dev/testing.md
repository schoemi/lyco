# Testing Guide

LyCo nutzt drei Test-Ebenen: Unit-Tests (Vitest), Story-Regressionstests (Storybook Test-Runner) und E2E-Tests (Playwright).

## Übersicht

| Ebene | Tool | Befehl | Was wird getestet? |
|---|---|---|---|
| Unit / Integration | Vitest | `npm test` | Logik, Hooks, API-Routen, Components |
| Story-Regression | Storybook Test-Runner | `npm run test:stories` | Jede Story rendert fehlerfrei + a11y |
| E2E | Playwright | `npm run test:e2e` | User-Flows im Browser |

---

## 1. Unit-Tests (Vitest)

Bestehende Test-Suite mit Vitest, Testing Library und fast-check für Property-Based Tests.

```bash
# Alle Unit-Tests ausführen
npm test

# Einzelne Datei
npx vitest --run __tests__/cloze/gap-input.test.ts
```

Tests liegen unter `__tests__/` und sind nach Feature-Bereichen organisiert (z.B. `cloze/`, `audio/`, `auth/`).

---

## 2. Storybook Test-Runner (Story-Regression + a11y)

Der Test-Runner rendert jede Story automatisch mit Playwright und prüft:

- **Rendering**: Wirft die Story einen Fehler? Rendert sie vollständig?
- **Accessibility**: axe-core prüft jede Story auf WCAG-Violations.

### Voraussetzungen

Storybook muss laufen, bevor der Test-Runner gestartet wird.

### Lokal ausführen

```bash
# Terminal 1: Storybook starten
npm run storybook

# Terminal 2: Test-Runner starten (wartet auf Port 6006)
npm run test:stories
```

### In CI ausführen

Das CI-Script baut Storybook statisch, startet einen HTTP-Server und führt die Tests aus:

```bash
npm run test:stories:ci
```

### Konfiguration

Die Test-Runner-Konfiguration liegt in `storybook.test-runner.config.ts`. Dort werden die axe-core Checks konfiguriert:

```typescript
// storybook.test-runner.config.ts
const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);       // axe-core in die Seite injizieren
  },
  async postVisit(page) {
    await checkA11y(page, "#storybook-root", {
      detailedReport: true,       // Detaillierter Report bei Violations
    });
  },
};
```

### Vorhandene Stories

Stories liegen direkt neben ihren Komponenten als `*.stories.tsx`:

```
src/components/
├── import/
│   ├── genius-search-panel.stories.tsx
│   ├── pdf-uploader.stories.tsx
│   ├── import-tabs.stories.tsx
│   └── text-editor.stories.tsx
├── zeile-fuer-zeile/
│   ├── aktive-zeile.stories.tsx
│   ├── strophen-navigator.stories.tsx
│   ├── eingabe-bereich.stories.tsx
│   ├── fortschritts-dots.stories.tsx
│   ├── kumulative-ansicht.stories.tsx
│   └── navbar.stories.tsx
└── ...
```

### Neue Story anlegen

```tsx
// src/components/example/my-component.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./my-component";

const meta: Meta<typeof MyComponent> = {
  title: "Components/MyComponent",
  component: MyComponent,
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    label: "Beispiel",
  },
};
```

---

## 3. E2E-Tests (Playwright)

Playwright testet komplette User-Flows im echten Browser gegen die laufende App.

### Lokal ausführen

```bash
# Tests ausführen (startet die App automatisch, falls nicht schon laufend)
npm run test:e2e

# Interaktiver UI-Modus zum Debuggen
npm run test:e2e:ui
```

### Konfiguration

Die Playwright-Konfiguration liegt in `playwright.config.ts`:

- **Test-Verzeichnis**: `e2e/`
- **Browser**: Chromium
- **Base-URL**: `http://localhost:3000` (überschreibbar via `PLAYWRIGHT_BASE_URL`)
- **Web-Server**: Startet automatisch `npm run build && npm run start`, wenn kein Server auf Port 3000 läuft
- **Screenshots**: Nur bei Fehlern
- **Traces**: Beim ersten Retry (hilfreich zum Debuggen)

### Teststruktur

```
e2e/
├── smoke.spec.ts          # Basis-Smoke-Tests
├── test-results/          # Screenshots, Traces (gitignored)
└── ...                    # Weitere Specs nach Feature
```

### Neuen E2E-Test schreiben

```typescript
// e2e/login-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("User kann sich einloggen", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-Mail").fill("test@example.com");
    await page.getByLabel("Passwort").fill("geheim123");
    await page.getByRole("button", { name: "Anmelden" }).click();

    await expect(page).toHaveURL("/dashboard");
  });
});
```

### Nützliche Playwright-Befehle

```bash
# Nur einen bestimmten Test ausführen
npx playwright test e2e/smoke.spec.ts

# Tests mit sichtbarem Browser
npx playwright test --headed

# HTML-Report öffnen (nach Testlauf)
npx playwright show-report

# Code-Generator: Tests interaktiv aufnehmen
npx playwright codegen http://localhost:3000
```

Der Code-Generator (`codegen`) ist besonders nützlich, um schnell neue Tests zu erstellen — er zeichnet Klicks und Eingaben auf und generiert den Testcode.

---

## Alle Tests ausführen

```bash
# Unit-Tests
npm test

# Story-Regression (Storybook muss laufen)
npm run test:stories

# E2E-Tests
npm run test:e2e
```

---

## Artefakte

| Artefakt | Pfad | Gitignored |
|---|---|---|
| Playwright Test-Results | `e2e/test-results/` | ✅ |
| Playwright HTML-Report | `playwright-report/` | ✅ |
| Storybook Build | `storybook-static/` | ✅ |
