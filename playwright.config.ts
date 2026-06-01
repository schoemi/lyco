import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E-Konfiguration für LyCo.
 *
 * Testet User-Flows gegen die laufende Next.js-App.
 * Start: `npm run test:e2e`
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",

  /* Parallele Tests pro Worker */
  fullyParallel: true,

  /* CI: keine Retries. Lokal: 1 Retry für Flakiness */
  retries: process.env.CI ? 0 : 1,

  /* Reporter */
  reporter: process.env.CI
    ? [["github"], ["junit", { outputFile: "e2e/test-results/results.xml" }]]
    : [["html", { outputFolder: "e2e/playwright-report" }]],

  use: {
    /* Base-URL aus env oder localhost:3000 */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    /* Screenshots bei Fehlern */
    screenshot: "only-on-failure",

    /* Traces bei Retries */
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Dev-Server automatisch starten wenn nicht schon laufend */
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
