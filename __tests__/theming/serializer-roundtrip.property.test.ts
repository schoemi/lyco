/**
 * Property 1: Serialisierungs-Round-Trip
 *
 * For every valid ThemeConfig, serializing to JSON and then deserializing
 * should produce a deep-equal object:
 * `deserializeTheme(serializeTheme(config))` is deep-equal to `config`.
 *
 * **Validates: Requirements 15.4, 15.5, 15.6**
 */

// Feature: theming-customization, Property 1: Serialisierungs-Round-Trip

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { serializeTheme, deserializeTheme } from '@/lib/theme/serializer';
import type { ThemeConfig, ThemeColors, ThemeTypography, KaraokeTheme } from '@/lib/theme/types';

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

/** Generates a valid app name (1–50 non-empty chars). */
const arbAppName: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generates a valid CSS font-weight string (100–900, multiples of 100). */
const arbFontWeight: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 9 })
  .map((n) => String(n * 100));

/** Generates a valid non-empty font family string. */
const arbFontFamily: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ,\'-'.split('')), { minLength: 1, maxLength: 40 })
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0);

/** Generates a valid px size string (integer). */
const arbPxSize: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 200 })
  .map((n) => `${n}px`);

/** Generates a valid karaoke active line size (14–48px). */
const arbKaraokeActiveSize: fc.Arbitrary<string> = fc
  .integer({ min: 14, max: 48 })
  .map((n) => `${n}px`);

/** Generates a valid accent colour: either null or a valid hex. */
const arbAccent: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  arbHexColor,
);

/** Generates a valid karaoke colour (hex or rgba). */
const arbKaraokeColor: fc.Arbitrary<string> = fc.oneof(
  arbHexColor,
  fc
    .tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.double({ min: 0, max: 1, noNaN: true }),
    )
    .map(([r, g, b, a]) => `rgba(${r},${g},${b},${Number(a.toFixed(2))})`),
);

/** Generates a valid ThemeColors object. */
const arbThemeColors: fc.Arbitrary<ThemeColors> = fc.record({
  primary: arbHexColor,
  accent: arbAccent,
  border: arbHexColor,
  pageBg: arbHexColor,
  cardBg: arbHexColor,
  tabActiveBg: arbHexColor,
  tabInactiveBg: arbHexColor,
  controlBg: arbHexColor,
  success: arbHexColor,
  warning: arbHexColor,
  error: arbHexColor,
  primaryButton: arbHexColor,
  secondaryButton: arbHexColor,
  newSongButton: arbHexColor,
  translationToggle: arbHexColor,
});

/** Generates a valid ThemeTypography object. */
const arbThemeTypography: fc.Arbitrary<ThemeTypography> = fc.record({
  headlineFont: arbFontFamily,
  headlineWeight: arbFontWeight,
  copyFont: arbFontFamily,
  copyWeight: arbFontWeight,
  labelFont: arbFontFamily,
  labelWeight: arbFontWeight,
  songLineFont: arbFontFamily,
  songLineWeight: arbFontWeight,
  songLineSize: arbPxSize,
  translationLineFont: arbFontFamily,
  translationLineWeight: arbFontWeight,
  translationLineSize: arbPxSize,
});

/** Generates a valid KaraokeTheme object. */
const arbKaraokeTheme: fc.Arbitrary<KaraokeTheme> = fc.record({
  activeLineColor: arbKaraokeColor,
  readLineColor: arbKaraokeColor,
  unreadLineColor: arbKaraokeColor,
  activeLineSize: arbKaraokeActiveSize,
  readLineSize: arbPxSize,
  unreadLineSize: arbPxSize,
  bgFrom: arbHexColor,
  bgVia: arbHexColor,
  bgTo: arbHexColor,
});

/** Generates a valid ThemeConfig object. */
const arbThemeConfig: fc.Arbitrary<ThemeConfig> = fc.record({
  appName: arbAppName,
  colors: arbThemeColors,
  typography: arbThemeTypography,
  karaoke: arbKaraokeTheme,
});

// --- Property Tests ---

describe('Property 1: Serialisierungs-Round-Trip', () => {
  it('deserializeTheme(serializeTheme(config)) is deep-equal to config for every valid ThemeConfig', () => {
    fc.assert(
      fc.property(arbThemeConfig, (config) => {
        const serialized = serializeTheme(config);
        const deserialized = deserializeTheme(serialized);

        expect(deserialized).toEqual(config);
      }),
      { numRuns: 100 },
    );
  });
});
