import { test, expect } from "@playwright/test";

/**
 * Smoke-Test: Prüft, ob die App grundsätzlich erreichbar ist.
 */
test.describe("Smoke", () => {
  test("Startseite lädt erfolgreich", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
  });

  test("Login-Seite ist erreichbar", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });
});
