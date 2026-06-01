import { test, expect } from "@playwright/test";

/**
 * Regressionstests für den Login-Flow.
 * Requirements: 3.1, 3.4, 3.5, 3.6
 */
test.describe("Login-Flow Regression", () => {
  test("Erfolgreicher Login leitet von /login weg", async ({ page }) => {
    await page.goto("/login");

    await page
      .getByLabel("E-Mail-Adresse")
      .fill(process.env.TEST_USER ?? "");
    await page
      .getByLabel("Passwort")
      .fill(process.env.TEST_PASSWORD ?? "");

    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Fehlgeschlagener Login zeigt Fehlermeldung", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-Mail-Adresse").fill("ungueltig@beispiel.de");
    await page.getByLabel("Passwort").fill("falsches-passwort");

    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Anmeldedaten ungültig");
  });
});
