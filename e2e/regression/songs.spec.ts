import { test, expect } from "@playwright/test";

/**
 * Regressionstests für die Song-Listenansicht.
 *
 * Requirements: 3.2, 3.4, 3.5, 3.6
 *
 * Die /songs-Route leitet auf /dashboard weiter, wo die Song-Listenansicht
 * angezeigt wird. Für den Zugriff ist ein Login erforderlich.
 */
test.describe("Song-Listenansicht Regression", () => {
  test.beforeEach(async ({ page }) => {
    // Login herstellen bevor die Songs-Seite aufgerufen wird
    await page.goto("/login");
    await page.getByLabel("E-Mail-Adresse").fill(process.env.TEST_USER!);
    await page.getByLabel("Passwort").fill(process.env.TEST_PASSWORD!);
    await page.getByRole("button", { name: /anmelden/i }).click();
    // Warten bis der Login abgeschlossen ist (Weiterleitung weg von /login)
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Songs-Seite lädt und zeigt Überschrift", async ({ page }) => {
    await page.goto("/songs");
    // /songs leitet auf /dashboard weiter
    await expect(page).toHaveURL(/\/dashboard/);
    // Dashboard-Überschrift ist sichtbar
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("Songs-Seite zeigt Song-Elemente im DOM", async ({ page }) => {
    await page.goto("/songs");
    await expect(page).toHaveURL(/\/dashboard/);
    // Warten bis das Dashboard vollständig geladen ist (kein Ladeindikator mehr)
    await expect(page.getByText("Dashboard wird geladen…")).not.toBeVisible();
    // Mindestens ein Song-bezogenes Element ist vorhanden:
    // Entweder eine Song-Karte, ein Set oder der "Ohne Set"-Bereich
    const songSection = page.locator("section").filter({ hasText: /songs|set|ohne set/i });
    await expect(songSection.first()).toBeVisible();
  });
});
