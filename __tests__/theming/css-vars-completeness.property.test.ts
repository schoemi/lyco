/**
 * Property 2: CSS-Variablen-Vollständigkeit
 *
 * For every valid ThemeConfig, `themeToCssVars(config)` should produce a CSS
 * string containing ALL expected variable names and the values should
 * correspond to the configured values.
 *
 * **Validates: Requirements 1.2, 3.3, 4.2, 5.2, 5.3, 6.2, 7.2, 7.3, 7.4,
 *   8.2, 9.2, 9.3, 10.2, 10.3, 10.4, 11.2, 11.3, 12.2, 15.2, 16.1, 16.4**
 */

// Feature: theming-customization, Property 2: CSS-Variablen-Vollständigkeit

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { themeToCssVars, cssVarsToStyleObject } from '@/lib/theme/serializer';
import { generatePalette } from '@/lib/theme/palette-generator';
import { PALETTE_STEPS } from '@/lib/theme/types';
import type { ThemeConfig, ThemeColors, ThemeTypography, KaraokeTheme } from '@/lib/theme/types';

// --- Arbitraries (reused from serializer-roundtrip pattern) ---

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

/** App name without characters that break CSS parsing (;, ', newlines). */
const arbAppName: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.!äöüÄÖÜß'.split('')), { minLength: 1, maxLength: 50 })
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0);

const arbFontWeight: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 9 })
  .map((n) => String(n * 100));

const arbFontFamily: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ,\'-'.split('')), { minLength: 1, maxLength: 40 })
  .map((chars) => chars.join('').trim())
  .filter((s) => s.length > 0);

const arbPxSize: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 200 })
  .map((n) => `${n}px`);

const arbKaraokeActiveSize: fc.Arbitrary<string> = fc
  .integer({ min: 14, max: 48 })
  .map((n) => `${n}px`);

const arbAccent: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  arbHexColor,
);

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

const arbKaraokeTheme: fc.Arbitrary<KaraokeTheme> = fc.record({
  activeLineColor: arbKaraokeColor,
  readLineColor: arbKaraokeColor,
  unreadLineColor: arbKaraokeColor,
  activeLineSize: arbKaraokeActiveSize,
  readLineSize: arbPxSize,
  unreadLineSize: arbPxSize,
});

const arbThemeConfig: fc.Arbitrary<ThemeConfig> = fc.record({
  appName: arbAppName,
  colors: arbThemeColors,
  typography: arbThemeTypography,
  karaoke: arbKaraokeTheme,
});

// --- Expected CSS variable names ---

const PALETTE_VAR_NAMES = PALETTE_STEPS.flatMap((step) => [
  `--color-primary-${step}`,
  `--color-accent-${step}`,
]);

const DIRECT_COLOR_VARS = [
  '--color-border',
  '--color-page-bg',
  '--color-card-bg',
  '--color-tab-active-bg',
  '--color-tab-inactive-bg',
  '--color-control-bg',
  '--color-success',
  '--color-warning',
  '--color-error',
  '--color-btn-primary',
  '--color-btn-secondary',
  '--color-btn-new-song',
  '--color-translation-toggle',
];

const KARAOKE_VARS = [
  '--karaoke-active-color',
  '--karaoke-read-color',
  '--karaoke-unread-color',
  '--karaoke-active-size',
  '--karaoke-read-size',
  '--karaoke-unread-size',
];

const TYPOGRAPHY_VARS = [
  '--font-headline',
  '--font-headline-weight',
  '--font-copy',
  '--font-copy-weight',
  '--font-label',
  '--font-label-weight',
  '--font-song-line',
  '--font-song-line-weight',
  '--font-song-line-size',
  '--font-translation-line',
  '--font-translation-line-weight',
  '--font-translation-line-size',
];

const APP_NAME_VAR = '--app-name';

const ALL_EXPECTED_VARS = [
  ...PALETTE_VAR_NAMES,
  ...DIRECT_COLOR_VARS,
  ...KARAOKE_VARS,
  ...TYPOGRAPHY_VARS,
  APP_NAME_VAR,
];

// --- Property Tests ---

describe('Property 2: CSS-Variablen-Vollständigkeit', () => {
  it('themeToCssVars(config) contains ALL expected CSS variable names for every valid ThemeConfig', () => {
    fc.assert(
      fc.property(arbThemeConfig, (config) => {
        const cssVars = themeToCssVars(config);

        for (const varName of ALL_EXPECTED_VARS) {
          expect(cssVars).toContain(`${varName}:`);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('CSS variable values correspond to the configured ThemeConfig values', () => {
    fc.assert(
      fc.property(arbThemeConfig, (config) => {
        const cssVars = themeToCssVars(config);
        const parsed = cssVarsToStyleObject(cssVars);

        // Primary palette values
        const primaryPalette = generatePalette(config.colors.primary);
        for (const step of PALETTE_STEPS) {
          expect(parsed[`--color-primary-${step}`]).toBe(primaryPalette[step]);
        }

        // Accent palette values (fallback to primary if null)
        const accentBase = config.colors.accent ?? config.colors.primary;
        const accentPalette = generatePalette(accentBase);
        for (const step of PALETTE_STEPS) {
          expect(parsed[`--color-accent-${step}`]).toBe(accentPalette[step]);
        }

        // Direct colour values
        expect(parsed['--color-border']).toBe(config.colors.border);
        expect(parsed['--color-page-bg']).toBe(config.colors.pageBg);
        expect(parsed['--color-card-bg']).toBe(config.colors.cardBg);
        expect(parsed['--color-tab-active-bg']).toBe(config.colors.tabActiveBg);
        expect(parsed['--color-tab-inactive-bg']).toBe(config.colors.tabInactiveBg);
        expect(parsed['--color-control-bg']).toBe(config.colors.controlBg);
        expect(parsed['--color-success']).toBe(config.colors.success);
        expect(parsed['--color-warning']).toBe(config.colors.warning);
        expect(parsed['--color-error']).toBe(config.colors.error);
        expect(parsed['--color-btn-primary']).toBe(config.colors.primaryButton);
        expect(parsed['--color-btn-secondary']).toBe(config.colors.secondaryButton);
        expect(parsed['--color-btn-new-song']).toBe(config.colors.newSongButton);
        expect(parsed['--color-translation-toggle']).toBe(config.colors.translationToggle);

        // Karaoke values
        expect(parsed['--karaoke-active-color']).toBe(config.karaoke.activeLineColor);
        expect(parsed['--karaoke-read-color']).toBe(config.karaoke.readLineColor);
        expect(parsed['--karaoke-unread-color']).toBe(config.karaoke.unreadLineColor);
        expect(parsed['--karaoke-active-size']).toBe(config.karaoke.activeLineSize);
        expect(parsed['--karaoke-read-size']).toBe(config.karaoke.readLineSize);
        expect(parsed['--karaoke-unread-size']).toBe(config.karaoke.unreadLineSize);

        // Typography values
        expect(parsed['--font-headline']).toBe(config.typography.headlineFont);
        expect(parsed['--font-headline-weight']).toBe(config.typography.headlineWeight);
        expect(parsed['--font-copy']).toBe(config.typography.copyFont);
        expect(parsed['--font-copy-weight']).toBe(config.typography.copyWeight);
        expect(parsed['--font-label']).toBe(config.typography.labelFont);
        expect(parsed['--font-label-weight']).toBe(config.typography.labelWeight);
        expect(parsed['--font-song-line']).toBe(config.typography.songLineFont);
        expect(parsed['--font-song-line-weight']).toBe(config.typography.songLineWeight);
        expect(parsed['--font-song-line-size']).toBe(config.typography.songLineSize);
        expect(parsed['--font-translation-line']).toBe(config.typography.translationLineFont);
        expect(parsed['--font-translation-line-weight']).toBe(config.typography.translationLineWeight);
        expect(parsed['--font-translation-line-size']).toBe(config.typography.translationLineSize);

        // App name
        expect(parsed['--app-name']).toBe(`'${config.appName}'`);
      }),
      { numRuns: 100 },
    );
  });
});
