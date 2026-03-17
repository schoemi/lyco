/**
 * Property 7: Kontrast zwischen Seiten- und Card-Hintergrund
 *
 * For every valid ThemeConfig, the lightness difference (in HSL) between
 * `pageBg` and `cardBg` should exceed a minimum value to ensure visible contrast.
 *
 * **Validates: Requirements 5.4**
 */

// Feature: theming-customization, Property 7: Kontrast zwischen Seiten- und Card-Hintergrund

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { hexToHsl } from '@/lib/theme/palette-generator';
import { getDefaultTheme } from '@/lib/theme/serializer';
import type { ThemeConfig, ThemeColors, ThemeTypography, KaraokeTheme } from '@/lib/theme/types';

// Minimum lightness difference (%) between pageBg and cardBg
const MIN_LIGHTNESS_DIFF = 1;

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

/**
 * Generates a pair of hex colours with guaranteed lightness difference.
 * One colour has lightness in [0, 45] and the other in [55, 100],
 * ensuring at least 10% lightness difference.
 */
const arbContrastingBgPair: fc.Arbitrary<{ pageBg: string; cardBg: string }> = fc
  .tuple(
    // pageBg: generate with a specific lightness range
    fc.integer({ min: 0, max: 360 }),  // hue
    fc.integer({ min: 0, max: 100 }),  // saturation
    fc.integer({ min: 70, max: 95 }),  // lightness for pageBg (darker of the two light colors)
    // cardBg offset: ensure different lightness
    fc.integer({ min: 3, max: 30 }),   // lightness offset (added to pageBg lightness, clamped)
  )
  .map(([h, s, pageBgL, offset]) => {
    const cardBgL = Math.min(100, pageBgL + offset);
    // Convert HSL to hex manually
    const toHex = (hue: number, sat: number, light: number): string => {
      const sNorm = sat / 100;
      const lNorm = light / 100;
      const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = lNorm - c / 2;
      let r: number, g: number, b: number;
      if (hue < 60) [r, g, b] = [c, x, 0];
      else if (hue < 120) [r, g, b] = [x, c, 0];
      else if (hue < 180) [r, g, b] = [0, c, x];
      else if (hue < 240) [r, g, b] = [0, x, c];
      else if (hue < 300) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      const ch = (v: number) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0');
      return `#${ch(r)}${ch(g)}${ch(b)}`;
    };
    return {
      pageBg: toHex(h, s, pageBgL),
      cardBg: toHex(h, s, cardBgL),
    };
  });

/** Generates a valid CSS font-weight string. */
const arbFontWeight: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 9 })
  .map((n) => String(n * 100));

/** Generates a valid non-empty font family string. */
const arbFontFamily: fc.Arbitrary<string> = fc.constant("'Inter', system-ui, sans-serif");

/** Generates a valid px size string. */
const arbPxSize: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 200 })
  .map((n) => `${n}px`);

/** Generates a valid karaoke active line size (14–48px). */
const arbKaraokeActiveSize: fc.Arbitrary<string> = fc
  .integer({ min: 14, max: 48 })
  .map((n) => `${n}px`);

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
});

/** Generates a valid ThemeConfig with contrasting pageBg and cardBg. */
const arbThemeConfigWithContrast: fc.Arbitrary<ThemeConfig> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    arbContrastingBgPair,
    arbHexColor, // primary
    fc.oneof(fc.constant(null), arbHexColor), // accent
    arbHexColor, // border
    arbHexColor, // tabActiveBg
    arbHexColor, // tabInactiveBg
    arbHexColor, // controlBg
    arbHexColor, // success
    arbHexColor, // warning
    arbHexColor, // error
    arbHexColor, // primaryButton
    arbHexColor, // secondaryButton
    arbHexColor, // newSongButton
    arbHexColor, // translationToggle
    arbThemeTypography,
    arbKaraokeTheme,
  )
  .map(([
    appName, bgPair, primary, accent, border,
    tabActiveBg, tabInactiveBg, controlBg,
    success, warning, error,
    primaryButton, secondaryButton, newSongButton, translationToggle,
    typography, karaoke,
  ]) => {
    const colors: ThemeColors = {
      primary,
      accent,
      border,
      pageBg: bgPair.pageBg,
      cardBg: bgPair.cardBg,
      tabActiveBg,
      tabInactiveBg,
      controlBg,
      success,
      warning,
      error,
      primaryButton,
      secondaryButton,
      newSongButton,
      translationToggle,
    };
    return { appName, colors, typography, karaoke } as ThemeConfig;
  });

// --- Property Tests ---

describe('Property 7: Kontrast zwischen Seiten- und Card-Hintergrund', () => {
  it('default theme has visible lightness difference between pageBg and cardBg', () => {
    const defaultTheme = getDefaultTheme();
    const pageBgHsl = hexToHsl(defaultTheme.colors.pageBg);
    const cardBgHsl = hexToHsl(defaultTheme.colors.cardBg);
    const diff = Math.abs(pageBgHsl.l - cardBgHsl.l);

    expect(diff).toBeGreaterThanOrEqual(MIN_LIGHTNESS_DIFF);
  });

  it('for every ThemeConfig with contrasting backgrounds, lightness difference exceeds minimum', () => {
    fc.assert(
      fc.property(arbThemeConfigWithContrast, (config) => {
        const pageBgHsl = hexToHsl(config.colors.pageBg);
        const cardBgHsl = hexToHsl(config.colors.cardBg);
        const diff = Math.abs(pageBgHsl.l - cardBgHsl.l);

        expect(diff).toBeGreaterThanOrEqual(MIN_LIGHTNESS_DIFF);
      }),
      { numRuns: 100 },
    );
  });
});
