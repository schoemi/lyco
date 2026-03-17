/**
 * Property 3: Paletten-Generierung erzeugt 11 Stufen
 *
 * For every valid hex colour, `generatePalette(hex)` returns an object with
 * exactly 11 entries (steps 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950),
 * where each entry is a valid hex colour string.
 *
 * **Validates: Requirements 2.2, 3.2**
 */

// Feature: theming-customization, Property 3: Paletten-Generierung erzeugt 11 Stufen

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generatePalette, isValidHex } from '@/lib/theme/palette-generator';
import { PALETTE_STEPS } from '@/lib/theme/types';

// --- Arbitraries ---

/** Generates a valid 6-digit hex colour string (#RRGGBB). */
const arbHexColor: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
  );

// --- Property Tests ---

describe('Property 3: Paletten-Generierung erzeugt 11 Stufen', () => {
  it('generatePalette returns exactly 11 entries for every valid hex colour', () => {
    fc.assert(
      fc.property(arbHexColor, (hex) => {
        const palette = generatePalette(hex);
        const keys = Object.keys(palette).map(Number);

        // Exactly 11 entries
        expect(keys).toHaveLength(11);

        // All expected steps are present
        for (const step of PALETTE_STEPS) {
          expect(palette).toHaveProperty(String(step));
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every palette entry is a valid hex colour string', () => {
    fc.assert(
      fc.property(arbHexColor, (hex) => {
        const palette = generatePalette(hex);

        for (const step of PALETTE_STEPS) {
          const value = palette[step];
          expect(typeof value).toBe('string');
          expect(isValidHex(value)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
