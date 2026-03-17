/**
 * Property 9: Karaoke-Zeilenfarben paarweise verschieden
 *
 * For every valid ThemeConfig, the three karaoke line colors
 * (`activeLineColor`, `readLineColor`, `unreadLineColor`) should be
 * pairwise different (case-insensitive string comparison).
 *
 * **Validates: Requirements 8.3**
 */

// Feature: theming-customization, Property 9: Karaoke-Zeilenfarben paarweise verschieden

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

/** Generates a karaoke color string (hex or rgba). */
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

/**
 * Generates three karaoke line colors guaranteed to be pairwise distinct
 * (case-insensitive).
 */
const arbDistinctKaraokeColors: fc.Arbitrary<{
  activeLineColor: string;
  readLineColor: string;
  unreadLineColor: string;
}> = fc
  .tuple(arbKaraokeColor, arbKaraokeColor, arbKaraokeColor)
  .filter(([a, b, c]) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const cl = c.toLowerCase();
    return al !== bl && al !== cl && bl !== cl;
  })
  .map(([activeLineColor, readLineColor, unreadLineColor]) => ({
    activeLineColor,
    readLineColor,
    unreadLineColor,
  }));

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

/** Generates a valid ThemeConfig with pairwise distinct karaoke line colors. */
const arbThemeConfigWithDistinctKaraokeColors: fc.Arbitrary<ThemeConfig> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    arbHexColor, // primary
    fc.oneof(fc.constant(null), arbHexColor), // accent
    arbHexColor, // border
    arbHexColor, // pageBg
    arbHexColor, // cardBg
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
    arbDistinctKaraokeColors,
    arbKaraokeActiveSize,
    arbPxSize, // readLineSize
    arbPxSize, // unreadLineSize
  )
  .map(([
    appName, primary, accent, border, pageBg, cardBg,
    tabActiveBg, tabInactiveBg, controlBg,
    success, warning, error,
    primaryButton, secondaryButton, newSongButton, translationToggle,
    typography, karaokeColors, activeLineSize, readLineSize, unreadLineSize,
  ]) => {
    const colors: ThemeColors = {
      primary,
      accent,
      border,
      pageBg,
      cardBg,
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
    const karaoke: KaraokeTheme = {
      activeLineColor: karaokeColors.activeLineColor,
      readLineColor: karaokeColors.readLineColor,
      unreadLineColor: karaokeColors.unreadLineColor,
      activeLineSize,
      readLineSize,
      unreadLineSize,
    };
    return { appName, colors, typography, karaoke } as ThemeConfig;
  });

// --- Property Tests ---

describe('Property 9: Karaoke-Zeilenfarben paarweise verschieden', () => {
  it('default theme has pairwise distinct karaoke line colors', () => {
    const d = getDefaultTheme();
    const active = d.karaoke.activeLineColor.toLowerCase();
    const read = d.karaoke.readLineColor.toLowerCase();
    const unread = d.karaoke.unreadLineColor.toLowerCase();

    expect(active).not.toBe(read);
    expect(active).not.toBe(unread);
    expect(read).not.toBe(unread);
  });

  it('for every ThemeConfig with distinct karaoke colors, all three are pairwise different (case-insensitive)', () => {
    fc.assert(
      fc.property(arbThemeConfigWithDistinctKaraokeColors, (config) => {
        const active = config.karaoke.activeLineColor.toLowerCase();
        const read = config.karaoke.readLineColor.toLowerCase();
        const unread = config.karaoke.unreadLineColor.toLowerCase();

        expect(active).not.toBe(read);
        expect(active).not.toBe(unread);
        expect(read).not.toBe(unread);
      }),
      { numRuns: 100 },
    );
  });
});
