/**
 * Property 8: Schriftgrößen-Validierung
 *
 * Für jeden konfigurierten Schriftgrößen-Wert soll dieser einer der 5 gültigen
 * Stufen (32, 40, 48, 56, 72) entsprechen und nie unter 32px liegen.
 * Ungültige Werte sollen auf den Fallback (48px) zurückfallen.
 *
 * **Validates: Anforderung 6.3**
 */
// Feature: lyco-stage, Property 8: Schriftgrößen-Validierung

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { loadStageSettings, saveStageSettings, STAGE_STORAGE_KEYS } from "@/lib/stage/storage";
import { VALID_FONT_SIZES, DEFAULT_STAGE_SETTINGS } from "@/types/stage";

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

describe("Property 8: Schriftgrößen-Validierung", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("valid font sizes are preserved after round-trip", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_FONT_SIZES), (fontSize) => {
        localStorageMock.clear();
        saveStageSettings({ ...DEFAULT_STAGE_SETTINGS, fontSize });
        const loaded = loadStageSettings();

        expect(loaded.fontSize).toBe(fontSize);
        expect(VALID_FONT_SIZES).toContain(loaded.fontSize);
        expect(loaded.fontSize).toBeGreaterThanOrEqual(32);
      }),
      { numRuns: 100 },
    );
  });

  it("invalid font sizes fall back to default (48px)", () => {
    // Generate values that are NOT in the valid set
    const invalidFontSize = fc.integer({ min: -1000, max: 1000 }).filter(
      (n) => !(VALID_FONT_SIZES as readonly number[]).includes(n),
    );

    fc.assert(
      fc.property(invalidFontSize, (invalidSize) => {
        localStorageMock.clear();
        // Write invalid value directly to localStorage
        localStorageMock.setItem(STAGE_STORAGE_KEYS.fontSize, String(invalidSize));
        const loaded = loadStageSettings();

        expect(loaded.fontSize).toBe(DEFAULT_STAGE_SETTINGS.fontSize); // 48
        expect(VALID_FONT_SIZES).toContain(loaded.fontSize);
        expect(loaded.fontSize).toBeGreaterThanOrEqual(32);
      }),
      { numRuns: 100 },
    );
  });
});
