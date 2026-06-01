# E2E-Testinfrastruktur

Playwright-basierte End-to-End-Tests für die Lyco-Anwendung. Die Tests decken kritische User-Flows, Seitennavigation und Barrierefreiheit ab.

## Teststruktur

```
e2e/
├── smoke.spec.ts          # Smoke-Tests – grundlegende Erreichbarkeit der App
├── regression/            # Regressionstests für kritische User-Flows
│   ├── login.spec.ts      # Login-Flow (erfolgreicher Login, Fehlerbehandlung)
│   ├── songs.spec.ts      # Song-Listenansicht
│   └── navigation.spec.ts # Navigation zwischen Hauptbereichen
├── a11y/                  # Barrierefreiheitstests (axe-playwright)
│   └── pages.a11y.spec.ts # WCAG-Prüfung für Login, Startseite, Songs
├── playwright-report/     # Generierter HTML-Bericht (nach Testlauf)
└── test-results/          # Screenshots und Traces bei Fehlern
```

## Voraussetzungen

- **Node.js** 20 oder neuer
- **Playwright-Browser** installiert: `npx playwright install --with-deps chromium`
- **Laufende Next.js-App** auf `http://localhost:3000` (oder via `PLAYWRIGHT_BASE_URL`)

Die App kann lokal mit `npm run dev` oder `npm run build && npm start` gestartet werden. Playwright startet die App bei `npm run test:e2e` automatisch über die `webServer`-Konfiguration in `playwright.config.ts`.

## Verfügbare Befehle

```bash
# Alle E2E-Tests ausführen (startet Next.js automatisch)
npm run test:e2e

# Tests mit interaktiver UI ausführen (Playwright UI Mode)
npm run test:e2e:ui

# HTML-Bericht nach einem Testlauf anzeigen
npx playwright show-report e2e/playwright-report
```

## Umgebungsvariablen

| Variable               | Beschreibung                                      | Beispiel                    |
| ---------------------- | ------------------------------------------------- | --------------------------- |
| `TEST_USER`            | Benutzername für Login-Tests                      | `testuser@example.com`      |
| `TEST_PASSWORD`        | Passwort für Login-Tests                          | `geheimes-passwort`         |
| `PLAYWRIGHT_BASE_URL`  | Basis-URL der Anwendung (Standard: `localhost:3000`) | `http://localhost:3000`   |

Lokal können die Variablen in einer `.env`-Datei im Projektstamm gesetzt werden:

```bash
TEST_USER=testuser@example.com
TEST_PASSWORD=geheimes-passwort
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

In CI werden `TEST_USER` und `TEST_PASSWORD` als GitHub Secrets übergeben.

## CI/CD

Die Tests laufen automatisch bei jedem Push auf `main` und bei Pull Requests. Der Workflow ist in `.github/workflows/regression-tests.yml` definiert und führt zwei parallele Jobs aus:

- **`storybook-tests`**: Baut Storybook und führt Story-Tests mit axe-core-Barrierefreiheitsprüfungen aus
- **`playwright-tests`**: Baut Next.js und führt alle E2E-Tests aus

Testergebnisse (HTML-Bericht, Screenshots, Traces) werden als GitHub Actions Artefakte für 7 Tage gespeichert.
