/**
 * Property 7: Stage-Einstellungen Round-Trip
 *
 * Für jede gültige Kombination von Stage-Einstellungen (DisplayMode, ScrollSpeed,
 * FontSize, HighlightingEnabled, Schwellwerte) soll das Speichern in localStorage
 * und anschließende Laden die identischen Werte zurückgeben.
 *
 * **Validates: Anforderung 12.2**
 */
// Feature: lyco-stage, Property 7: Stage-Einstellungen Round-Trip

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { loadStageSettings, saveStageSettings } from "@/lib/stage/storage";
import type { StageSettings } from "@/types/stage";

// Simple localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const arbDisplayMode = fc.constantFrom(
  "einzelzeile" as const,
  "strophe" as const,
  "song" as const,
);

const arbFontSize = fc.constantFrom(32, 40, 48, 56, 72);

const arbStageSettings: fc.Arbitrary<StageSettings> = fc.record({
  displayMode: arbDisplayMode,
  scrollSpeed: fc.integer({ min: 1, max: 10 }),
  fontSize: arbFontSize,
  highlightingEnabled: fc.boolean(),
  highlightThresholdLow: fc.integer({ min: 0, max: 100 }),
  highlightThresholdHigh: fc.integer({ min: 0, max: 100 }),
});

describe("Property 7: Stage-Einstellungen Round-Trip", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("saveStageSettings followed by loadStageSettings returns identical values", () => {
    fc.assert(
      fc.property(arbStageSettings, (settings) => {
        localStorageMock.clear();
        saveStageSettings(settings);
        const loaded = loadStageSettings();

        expect(loaded.displayMode).toBe(settings.displayMode);
        expect(loaded.scrollSpeed).toBe(settings.scrollSpeed);
        expect(loaded.fontSize).toBe(settings.fontSize);
        expect(loaded.highlightingEnabled).toBe(settings.highlightingEnabled);
        expect(loaded.highlightThresholdLow).toBe(settings.highlightThresholdLow);
        expect(loaded.highlightThresholdHigh).toBe(settings.highlightThresholdHigh);
      }),
      { numRuns: 100 },
    );
  });
});
