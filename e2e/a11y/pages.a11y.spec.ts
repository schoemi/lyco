/**
 * Barrierefreiheitstests für die wichtigsten Seiten der Lyco-Anwendung.
 *
 * Property 1: Nur `critical` und `serious` Verstöße führen zu Testfehlern.
 * Property 3: `waitForLoadState("networkidle")` vor jeder axe-Analyse sicherstellen,
 *             dass dynamisch gerenderte Inhalte in die Prüfung einbezogen werden.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */
import { test, expect } from "@playwright/test";
import { injectAxe, getViolations } from "axe-playwright";

test.describe("Barrierefreiheit – Seiten", () => {
  test("Login-Seite hat keine critical/serious Verstöße", async ({ page }) => {
    await page.goto("/login");
    // Property 3: Vollständiges Laden vor Barrierefreiheitsprüfung
    await page.waitForLoadState("networkidle");
    await injectAxe(page);
    const allViolations = await getViolations(page, undefined, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
    // Property 1: Nur critical/serious als Fehler werten
    const violations = allViolations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(violations).toEqual([]);
  });

  test("Startseite hat keine critical/serious Verstöße", async ({ page }) => {
    await page.goto("/");
    // Property 3: Vollständiges Laden vor Barrierefreiheitsprüfung
    await page.waitForLoadState("networkidle");
    await injectAxe(page);
    const allViolations = await getViolations(page, undefined, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
    // Property 1: Nur critical/serious als Fehler werten
    const violations = allViolations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(violations).toEqual([]);
  });

  test("Song-Listenansicht hat keine critical/serious Verstöße", async ({
    page,
  }) => {
    await page.goto("/songs");
    // Property 3: Vollständiges Laden vor Barrierefreiheitsprüfung
    await page.waitForLoadState("networkidle");
    await injectAxe(page);
    const allViolations = await getViolations(page, undefined, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
    // Property 1: Nur critical/serious als Fehler werten
    const violations = allViolations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(violations).toEqual([]);
  });
});
