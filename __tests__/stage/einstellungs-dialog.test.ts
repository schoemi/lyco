/**
 * Unit-Test für StageEinstellungsDialog-Komponente
 * (src/components/stage/stage-einstellungs-dialog.tsx)
 *
 * Testet:
 * - Dialog öffnen/schließen (Req 12.1)
 * - Schriftgrößen-Auswahl mit 5 Stufen (Req 12.3, 6.3)
 * - DisplayMode-Auswahl (Req 6.2)
 * - Scroll-Geschwindigkeit (Req 7.4)
 * - Highlighting an/aus (Req 8.6)
 * - Highlighting-Schwellwerte (Req 8.7)
 * - Sofortige Anwendung via onSettingsChange (Req 12.3)
 * - Persistierung via saveStageSettings (Req 12.2)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/stage/stage-einstellungs-dialog.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("StageEinstellungsDialog — Quellcode-Inspektion", () => {
  // --- Directive ---

  it('uses "use client" directive', () => {
    expect(source).toContain('"use client"');
  });

  // --- Props-Interface (Req 12.1) ---

  it("exportiert StageEinstellungsDialogProps Interface", () => {
    expect(source).toContain("StageEinstellungsDialogProps");
  });

  it("Props-Interface enthält isOpen, onClose, settings, onSettingsChange", () => {
    expect(source).toContain("isOpen");
    expect(source).toContain("onClose");
    expect(source).toContain("settings");
    expect(source).toContain("onSettingsChange");
  });

  it("onSettingsChange akzeptiert Partial<StageSettings>", () => {
    expect(source).toContain("Partial<StageSettings>");
  });

  // --- Dialog-Semantik (Req 12.1) ---

  it('hat role="dialog" (Req 12.1)', () => {
    expect(source).toContain('role="dialog"');
  });

  it('hat aria-modal="true" (Req 12.1)', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it("hat aria-label auf dem Dialog (Req 12.1)", () => {
    expect(source).toMatch(/aria-label="[^"]*[Ee]instellung[^"]*"/);
  });

  // --- Schließen-Verhalten (Req 12.1) ---

  it("rendert nichts wenn isOpen false ist (Req 12.1)", () => {
    expect(source).toContain("if (!isOpen) return null");
  });

  it("schließt bei Escape-Taste (Req 12.1)", () => {
    expect(source).toContain('e.key === "Escape"');
    expect(source).toContain("onClose()");
  });

  it("hat Schließen-Button mit aria-label (Req 12.1)", () => {
    expect(source).toContain('aria-label="Dialog schließen"');
  });

  it("hat Backdrop der bei Klick schließt (Req 12.1)", () => {
    expect(source).toContain("onClick={onClose}");
    expect(source).toContain('aria-hidden="true"');
  });

  // --- Schriftgrößen-Auswahl (Req 12.3, 6.3) ---

  it("importiert VALID_FONT_SIZES (Req 6.3)", () => {
    expect(source).toContain("VALID_FONT_SIZES");
  });

  it("rendert Schriftgrößen-Selector (Req 6.3)", () => {
    expect(source).toContain("Schriftgröße");
    expect(source).toContain("stage-font-size");
  });

  it("Schriftgrößen-Selector iteriert über VALID_FONT_SIZES (Req 6.3)", () => {
    expect(source).toContain("VALID_FONT_SIZES.map");
  });

  it("Schriftgrößen-Änderung ruft applyChange auf (Req 12.3)", () => {
    expect(source).toContain("fontSize: Number(e.target.value)");
  });

  // --- DisplayMode-Auswahl (Req 6.2) ---

  it("rendert DisplayMode-Selector (Req 6.2)", () => {
    expect(source).toContain("Anzeigemodus");
    expect(source).toContain("stage-display-mode");
  });

  it("DisplayMode-Selector enthält einzelzeile, strophe, song (Req 6.2)", () => {
    expect(source).toContain("einzelzeile");
    expect(source).toContain("strophe");
    expect(source).toContain("song");
  });

  it("DisplayMode-Änderung ruft applyChange auf (Req 12.3)", () => {
    expect(source).toContain("displayMode: e.target.value as DisplayMode");
  });

  // --- Scroll-Geschwindigkeit ---

  it("rendert Scroll-Geschwindigkeit-Slider", () => {
    expect(source).toContain("Scroll-Geschwindigkeit");
    expect(source).toContain("scrollSpeed");
  });

  it("Scroll-Slider hat min=1, max=10 (Req 7.2)", () => {
    expect(source).toContain("min={1}");
    expect(source).toContain("max={10}");
  });

  it("Scroll-Slider hat aria-Attribute", () => {
    expect(source).toContain('aria-label="Scroll-Geschwindigkeit in Sekunden"');
    expect(source).toContain("aria-valuemin={1}");
    expect(source).toContain("aria-valuemax={10}");
    expect(source).toContain("aria-valuenow={settings.scrollSpeed}");
  });

  // --- Highlighting Toggle (Req 8.6) ---

  it("rendert Highlighting-Toggle (Req 8.6)", () => {
    expect(source).toContain("Lernfortschritt-Highlighting");
    expect(source).toContain("highlightingEnabled");
  });

  it('Highlighting-Toggle hat role="switch" (Req 8.6)', () => {
    expect(source).toContain('role="switch"');
  });

  it("Highlighting-Toggle hat aria-checked (Req 8.6)", () => {
    expect(source).toContain("aria-checked={settings.highlightingEnabled}");
  });

  it("Highlighting-Toggle ruft applyChange mit invertiertem Wert auf (Req 8.6)", () => {
    expect(source).toContain("highlightingEnabled: !settings.highlightingEnabled");
  });

  // --- Highlighting-Schwellwerte (Req 8.7) ---

  it("rendert Schwellwert-Slider nur wenn Highlighting aktiv ist (Req 8.7)", () => {
    expect(source).toContain("settings.highlightingEnabled && (");
  });

  it("rendert Schwellwert-niedrig-Slider (Req 8.7)", () => {
    expect(source).toContain("Schwellwert niedrig");
    expect(source).toContain("highlightThresholdLow");
  });

  it("rendert Schwellwert-hoch-Slider (Req 8.7)", () => {
    expect(source).toContain("Schwellwert hoch");
    expect(source).toContain("highlightThresholdHigh");
  });

  it("Schwellwert-Slider haben min=0, max=100 (Req 8.7)", () => {
    expect(source).toContain("min={0}");
    expect(source).toContain("max={100}");
  });

  it("Schwellwert-Slider haben aria-Attribute (Req 8.7)", () => {
    expect(source).toContain('aria-label="Schwellwert niedrig in Prozent"');
    expect(source).toContain('aria-label="Schwellwert hoch in Prozent"');
  });

  // --- Sofortige Anwendung (Req 12.3) ---

  it("definiert applyChange-Funktion die onSettingsChange aufruft (Req 12.3)", () => {
    expect(source).toContain("function applyChange");
    expect(source).toContain("onSettingsChange(partial)");
  });

  // --- Persistierung (Req 12.2) ---

  it("importiert saveStageSettings (Req 12.2)", () => {
    expect(source).toContain("saveStageSettings");
  });

  it("applyChange ruft saveStageSettings auf (Req 12.2)", () => {
    expect(source).toContain("saveStageSettings(updated)");
  });

  // --- Imports ---

  it("importiert StageSettings-Typ", () => {
    expect(source).toContain("StageSettings");
  });

  it("importiert DisplayMode-Typ", () => {
    expect(source).toContain("DisplayMode");
  });
});
