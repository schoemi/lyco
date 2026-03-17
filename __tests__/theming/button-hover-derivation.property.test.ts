/**
 * Property 10: Button-Hover/Focus-Ableitung
 *
 * For every valid hex color as button base color, the derived hover and focus
 * states should:
 * (a) be valid hex colors
 * (b) differ from the base color
 * (c) hover state should be darker than the base color (lower lightness in HSL)
 *
 * **Validates: Requirements 9.4**
 */

// Feature: theming-customization, Property 10: Button-Hover/Focus-Ableitung

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deriveButtonStates } from '@/lib/theme/serializer';
import { hexToHsl, isValidHex } from '@/lib/theme/palette-generator';

// --- Arbitraries ---

/**
 * Generates a valid 6-digit hex colour string (#RRGGBB) with lightness > 10
 * in HSL space. This constraint ensures the hover derivation (lightness - 10)
 * always produces a color different from the base.
 */
const arbHexColorWithSufficientLightness: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
  )
  .filter((hex) => {
    const { l } = hexToHsl(hex);
    return l > 10;
  });

// --- Property Tests ---

describe('Property 10: Button-Hover/Focus-Ableitung', () => {
  it('derived hover and focus states are valid hex colors, differ from base, and hover is darker', () => {
    fc.assert(
      fc.property(arbHexColorWithSufficientLightness, (baseHex) => {
        const { hover, focus } = deriveButtonStates(baseHex);

        // (a) Both derived states must be valid hex colors
        expect(isValidHex(hover)).toBe(true);
        expect(isValidHex(focus)).toBe(true);

        // (b) Both derived states must differ from the base color
        expect(hover.toLowerCase()).not.toBe(baseHex.toLowerCase());
        expect(focus.toLowerCase()).not.toBe(baseHex.toLowerCase());

        // (c) Hover state should be darker (lower lightness) than the base
        const baseLightness = hexToHsl(baseHex).l;
        const hoverLightness = hexToHsl(hover).l;
        expect(hoverLightness).toBeLessThan(baseLightness);
      }),
      { numRuns: 100 },
    );
  });
});
