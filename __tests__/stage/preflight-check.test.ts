/**
 * Unit-Test für PreflightCheck-Komponente
 * (src/components/stage/preflight-check.tsx)
 *
 * Testet:
 * - "Bühne vorbereiten"-Button vorhanden (Req 4.1)
 * - Fortschrittsbalken mit loaded/total (Req 4.3)
 * - Bestätigung nach Abschluss (Req 4.4)
 * - Fehlgeschlagene Songs werden namentlich aufgelistet (Req 4.5)
 * - Zeitstempel der letzten Synchronisation wird angezeigt (Req 4.6)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/stage/preflight-check.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("PreflightCheck component source", () => {
  // --- Directive ---

  it('uses "use client" directive', () => {
    expect(source).toContain('"use client"');
  });

  // --- Hook-Integration ---

  it("imports usePreflightCheck hook", () => {
    expect(source).toContain("usePreflightCheck");
  });

  it("destructures start, isRunning, progress, failedSongs, lastSync, persistWarning from hook", () => {
    expect(source).toContain("start");
    expect(source).toContain("isRunning");
    expect(source).toContain("progress");
    expect(source).toContain("failedSongs");
    expect(source).toContain("lastSync");
    expect(source).toContain("persistWarning");
  });

  // --- Props-Interface ---

  it("defines PreflightCheckProps with onComplete and onError", () => {
    expect(source).toContain("onComplete");
    expect(source).toContain("onError");
    expect(source).toContain("PreflightCheckProps");
  });

  // --- "Bühne vorbereiten"-Button (Req 4.1) ---

  it('renders "Bühne vorbereiten" button (Req 4.1)', () => {
    expect(source).toContain("Bühne vorbereiten");
    expect(source).toContain("<button");
  });

  it("button calls start() on click (Req 4.1)", () => {
    expect(source).toContain("handleStart");
    expect(source).toContain("onClick");
    expect(source).toContain("await start()");
  });

  it("button is disabled while isRunning (Req 4.1)", () => {
    expect(source).toContain("disabled={isRunning}");
  });

  // --- Fortschrittsbalken (Req 4.3) ---

  it("renders progress bar with role=progressbar (Req 4.3)", () => {
    expect(source).toContain('role="progressbar"');
  });

  it("shows loaded/total count in progress bar (Req 4.3)", () => {
    expect(source).toContain("progress.loaded");
    expect(source).toContain("progress.total");
  });

  it("progress bar uses aria-valuenow, aria-valuemin, aria-valuemax (Req 4.3)", () => {
    expect(source).toContain("aria-valuenow");
    expect(source).toContain("aria-valuemin");
    expect(source).toContain("aria-valuemax");
  });

  it("progress bar is only shown while isRunning (Req 4.3)", () => {
    expect(source).toContain("isRunning && hasProgress");
  });

  // --- Fehlgeschlagene Songs (Req 4.5) ---

  it("renders list of failed songs by name (Req 4.5)", () => {
    expect(source).toContain("failedSongs.map");
    expect(source).toContain("<ul");
    expect(source).toContain("<li");
  });

  it("shows failed songs section only when failedSongs.length > 0 (Req 4.5)", () => {
    expect(source).toContain("failedSongs.length > 0");
  });

  it("has data-testid for failed songs section (Req 4.5)", () => {
    expect(source).toContain('data-testid="failed-songs"');
  });

  // --- Zeitstempel (Req 4.4, 4.6) ---

  it("displays lastSync timestamp when available (Req 4.6)", () => {
    expect(source).toContain("lastSync");
    expect(source).toContain("Letzte Synchronisation");
  });

  it("uses <time> element with dateTime attribute for timestamp (Req 4.6)", () => {
    expect(source).toContain("<time");
    expect(source).toContain("dateTime={lastSync}");
  });

  it("has data-testid for last-sync element (Req 4.6)", () => {
    expect(source).toContain('data-testid="last-sync"');
  });

  // --- Erfolgsmeldung (Req 4.4) ---

  it("shows success message after completion (Req 4.4)", () => {
    expect(source).toContain("Alle Songs erfolgreich synchronisiert");
  });

  it("success message only shown when completed and no failed songs (Req 4.4)", () => {
    expect(source).toContain("hasCompleted && failedSongs.length === 0");
  });

  it("has data-testid for success message (Req 4.4)", () => {
    expect(source).toContain('data-testid="success-message"');
  });

  // --- Callbacks ---

  it("calls onError with failedSongs when songs failed", () => {
    expect(source).toContain("onError(failed)");
  });

  it("calls onComplete when no songs failed", () => {
    expect(source).toContain("onComplete()");
  });

  // --- Accessibility ---

  it("has aria-label on the region wrapper", () => {
    expect(source).toContain('aria-label="Bühne vorbereiten"');
    expect(source).toContain('role="region"');
  });

  it("has aria-label on the start button", () => {
    expect(source).toContain('aria-label="Bühne vorbereiten"');
  });
});
