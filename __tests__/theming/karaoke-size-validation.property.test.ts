/**
 * Property 6: Karaoke-Schriftgrößen-Begrenzung
 *
 * For every numeric value, the karaoke active line font size validation
 * should reject values outside 14px–48px range.
 * Values within 14–48px should be accepted.
 *
 * **Validates: Requirements 12.3**
 */

// Feature: theming-customization, Property 6: Karaoke-Schriftgrößen-Begrenzung

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateKaraokeFontSize } from '@/lib/theme/serializer';
import { KARAOKE_FONT_SIZE_MIN, KARAOKE_FONT_SIZE_MAX } from '@/lib/theme/types';

describe('Property 6: Karaoke-Schriftgrößen-Begrenzung', () => {
  it('accepts every integer value within 14–48px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: KARAOKE_FONT_SIZE_MIN, max: KARAOKE_FONT_SIZE_MAX }),
        (size) => {
          expect(validateKaraokeFontSize(`${size}px`)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('accepts every float value within 14–48px', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: KARAOKE_FONT_SIZE_MIN,
          max: KARAOKE_FONT_SIZE_MAX,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (size) => {
          expect(validateKaraokeFontSize(`${size}px`)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects every value below 14px', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: 0,
          max: KARAOKE_FONT_SIZE_MIN - 0.001,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (size) => {
          expect(validateKaraokeFontSize(`${size}px`)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects every value above 48px', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: KARAOKE_FONT_SIZE_MAX + 0.001,
          max: 1000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (size) => {
          expect(validateKaraokeFontSize(`${size}px`)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects negative values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -0.001, noNaN: true, noDefaultInfinity: true }),
        (size) => {
          expect(validateKaraokeFontSize(`${size}px`)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects strings without px suffix', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: KARAOKE_FONT_SIZE_MIN, max: KARAOKE_FONT_SIZE_MAX }),
        (size) => {
          expect(validateKaraokeFontSize(`${size}`)).toBe(false);
          expect(validateKaraokeFontSize(`${size}em`)).toBe(false);
          expect(validateKaraokeFontSize(`${size}rem`)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
