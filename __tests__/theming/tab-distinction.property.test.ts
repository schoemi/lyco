/**
 * Property 8: Aktiver vs. inaktiver Tab-Zustand unterscheidbar
 *
 * For every valid ThemeConfig, `tabActiveBg` should not equal `tabInactiveBg`
 * (case-insensitive hex comparison).
 *
 * **Validates: Requirements 6.3**
 */

// Feature: theming-customization, Property 8: Aktiver vs. inaktiver Tab-Zustand unterscheidbar

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getDefaultTheme } from '@/lib/theme/serializer';
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

/**
 * Generates a pair of hex colours guaranteed to be different (case-insensitive).
 * Produces two independent hex colours and filters out the rare case where they match.
 */
const arbDistinctHexPair: fc.Arbitrary<{ tabActiveBg: string; tabInactiveBg: string }> = fc
  .tuple(arbHexColor, arbHexColor)
  .filter(([a, b]) => a.toLowerCase() !== b.toLowerCase())
  .map(([tabActiveBg, tabInactiveBg]) => ({ tabActiveBg, tabInactiveBg }));

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

/** Generates a valid ThemeConfig with distinct tabActiveBg and tabInactiveBg. */
const arbThemeConfigWithDistinctTabs: fc.Arbitrary<ThemeConfig> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    arbHexColor, // primary
    fc.oneof(fc.constant(null), arbHexColor), // accent
    arbHexColor, // border
    arbHexColor, // pageBg
    arbHexColor, // cardBg
    arbDistinctHexPair, // tabActiveBg & tabInactiveBg
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
    appName, primary, accent, border, pageBg, cardBg,
    tabPair, controlBg,
    success, warning, error,
    primaryButton, secondaryButton, newSongButton, translationToggle,
    typography, karaoke,
  ]) => {
    const colors: ThemeColors = {
      primary,
      accent,
      border,
      pageBg,
      cardBg,
      tabActiveBg: tabPair.tabActiveBg,
      tabInactiveBg: tabPair.tabInactiveBg,
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

describe('Property 8: Aktiver vs. inaktiver Tab-Zustand unterscheidbar', () => {
  it('default theme has different tabActiveBg and tabInactiveBg', () => {
    const defaultTheme = getDefaultTheme();
    expect(
      defaultTheme.colors.tabActiveBg.toLowerCase(),
    ).not.toBe(defaultTheme.colors.tabInactiveBg.toLowerCase());
  });

  it('for every ThemeConfig with distinct tabs, tabActiveBg !== tabInactiveBg (case-insensitive)', () => {
    fc.assert(
      fc.property(arbThemeConfigWithDistinctTabs, (config) => {
        expect(
          config.colors.tabActiveBg.toLowerCase(),
        ).not.toBe(config.colors.tabInactiveBg.toLowerCase());
      }),
      { numRuns: 100 },
    );
  });
});
