import type { TestRunnerConfig } from "@storybook/test-runner";
import { injectAxe, checkA11y } from "axe-playwright";

/**
 * Storybook Test-Runner Konfiguration.
 *
 * Jede Story wird automatisch:
 * 1. Gerendert und auf Fehler geprüft
 * 2. Auf Accessibility-Violations getestet (axe-core)
 */
const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page) {
    await checkA11y(page, "#storybook-root", {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
};

export default config;
