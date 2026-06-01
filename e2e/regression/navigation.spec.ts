import { test, expect } from "@playwright/test";

/**
 * Navigation Regression Tests
 *
 * Prüft, dass die Hauptbereiche der Anwendung korrekt erreichbar sind.
 * Requirements: 3.3, 3.4, 3.5, 3.6
 */
test.describe("Navigation Regression", () => {
  test("Navigation zu /login – Seite lädt korrekt", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Navigation zu / – Startseite lädt korrekt", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Navigation zu /songs – Songs-Seite lädt oder Redirect auf Login", async ({
    page,
  }) => {
    await page.goto("/songs");
    // Entweder die Songs-Seite lädt direkt oder es erfolgt ein Redirect auf /login
    const url = page.url();
    const isOnSongs = url.includes("/songs");
    const isOnLogin = url.includes("/login");
    expect(isOnSongs || isOnLogin).toBe(true);
    await expect(page.locator("body")).toBeVisible();
  });
});
