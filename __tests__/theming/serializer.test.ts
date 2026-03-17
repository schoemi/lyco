/**
 * Unit tests for the theme serializer.
 *
 * Covers: getDefaultTheme, serializeTheme, deserializeTheme, themeToCssVars,
 * cssVarsToStyleObject, deriveButtonStates, and all validation helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultTheme,
  serializeTheme,
  deserializeTheme,
  themeToCssVars,
  cssVarsToStyleObject,
  deriveButtonStates,
  validateHexColor,
  validateAppName,
  validateKaraokeFontSize,
  validateFontWeight,
  validateFontFamily,
} from '@/lib/theme/serializer';
import { hexToHsl } from '@/lib/theme/palette-generator';

// ---------------------------------------------------------------------------
// getDefaultTheme
// ---------------------------------------------------------------------------

describe('getDefaultTheme', () => {
  it('returns a ThemeConfig with expected default values', () => {
    const theme = getDefaultTheme();
    expect(theme.appName).toBe('Lyco');
    expect(theme.colors.primary).toBe('#7c3aed');
    expect(theme.colors.accent).toBeNull();
    expect(theme.colors.border).toBe('#e5e7eb');
    expect(theme.colors.pageBg).toBe('#f9fafb');
    expect(theme.colors.cardBg).toBe('#ffffff');
    expect(theme.colors.success).toBe('#22c55e');
    expect(theme.colors.warning).toBe('#f97316');
    expect(theme.colors.error).toBe('#ef4444');
    expect(theme.typography.headlineWeight).toBe('700');
    expect(theme.typography.copyWeight).toBe('400');
    expect(theme.karaoke.activeLineSize).toBe('28px');
  });
});

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

describe('validateHexColor', () => {
  it('accepts valid hex colours', () => {
    expect(validateHexColor('#000000')).toBe(true);
    expect(validateHexColor('#ffffff')).toBe(true);
    expect(validateHexColor('#7c3aed')).toBe(true);
    expect(validateHexColor('#AABBCC')).toBe(true);
  });

  it('rejects invalid hex colours', () => {
    expect(validateHexColor('')).toBe(false);
    expect(validateHexColor('#fff')).toBe(false);
    expect(validateHexColor('7c3aed')).toBe(false);
    expect(validateHexColor('#gggggg')).toBe(false);
    expect(validateHexColor('#7c3aed00')).toBe(false);
  });
});

describe('validateAppName', () => {
  it('accepts names 1–50 chars', () => {
    expect(validateAppName('A')).toBe(true);
    expect(validateAppName('a'.repeat(50))).toBe(true);
  });

  it('accepts empty string (fallback handled elsewhere)', () => {
    expect(validateAppName('')).toBe(true);
  });

  it('rejects names over 50 chars', () => {
    expect(validateAppName('a'.repeat(51))).toBe(false);
  });
});

describe('validateKaraokeFontSize', () => {
  it('accepts sizes in range 14px–48px', () => {
    expect(validateKaraokeFontSize('14px')).toBe(true);
    expect(validateKaraokeFontSize('28px')).toBe(true);
    expect(validateKaraokeFontSize('48px')).toBe(true);
  });

  it('rejects sizes outside range', () => {
    expect(validateKaraokeFontSize('13px')).toBe(false);
    expect(validateKaraokeFontSize('49px')).toBe(false);
    expect(validateKaraokeFontSize('0px')).toBe(false);
  });

  it('rejects non-px values', () => {
    expect(validateKaraokeFontSize('28')).toBe(false);
    expect(validateKaraokeFontSize('28em')).toBe(false);
    expect(validateKaraokeFontSize('')).toBe(false);
  });
});

describe('validateFontWeight', () => {
  it('accepts weights 100–900', () => {
    expect(validateFontWeight('100')).toBe(true);
    expect(validateFontWeight('400')).toBe(true);
    expect(validateFontWeight('900')).toBe(true);
  });

  it('rejects weights outside range', () => {
    expect(validateFontWeight('0')).toBe(false);
    expect(validateFontWeight('99')).toBe(false);
    expect(validateFontWeight('901')).toBe(false);
    expect(validateFontWeight('1000')).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(validateFontWeight('bold')).toBe(false);
    expect(validateFontWeight('')).toBe(false);
    expect(validateFontWeight('400.5')).toBe(false);
  });
});

describe('validateFontFamily', () => {
  it('accepts non-empty strings', () => {
    expect(validateFontFamily('Inter')).toBe(true);
    expect(validateFontFamily("'Inter', sans-serif")).toBe(true);
  });

  it('rejects empty or whitespace-only strings', () => {
    expect(validateFontFamily('')).toBe(false);
    expect(validateFontFamily('   ')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Serialization round-trip
// ---------------------------------------------------------------------------

describe('serializeTheme / deserializeTheme', () => {
  it('round-trips the default theme', () => {
    const original = getDefaultTheme();
    const json = serializeTheme(original);
    const restored = deserializeTheme(json);
    expect(restored).toEqual(original);
  });

  it('falls back to default on invalid JSON', () => {
    const result = deserializeTheme('not-json');
    expect(result).toEqual(getDefaultTheme());
  });

  it('falls back to default on non-object JSON', () => {
    const result = deserializeTheme('"just a string"');
    expect(result).toEqual(getDefaultTheme());
  });

  it('replaces empty appName with "Song Text Trainer"', () => {
    const theme = getDefaultTheme();
    theme.appName = '';
    const json = serializeTheme(theme);
    const restored = deserializeTheme(json);
    expect(restored.appName).toBe('Song Text Trainer');
  });

  it('truncates appName longer than 50 chars', () => {
    const theme = getDefaultTheme();
    theme.appName = 'a'.repeat(60);
    const json = serializeTheme(theme);
    const restored = deserializeTheme(json);
    expect(restored.appName.length).toBe(50);
  });

  it('preserves null accent colour', () => {
    const theme = getDefaultTheme();
    theme.colors.accent = null;
    const json = serializeTheme(theme);
    const restored = deserializeTheme(json);
    expect(restored.colors.accent).toBeNull();
  });

  it('preserves non-null accent colour', () => {
    const theme = getDefaultTheme();
    theme.colors.accent = '#3b82f6';
    const json = serializeTheme(theme);
    const restored = deserializeTheme(json);
    expect(restored.colors.accent).toBe('#3b82f6');
  });
});

// ---------------------------------------------------------------------------
// themeToCssVars
// ---------------------------------------------------------------------------

describe('themeToCssVars', () => {
  it('contains all expected CSS variable names', () => {
    const css = themeToCssVars(getDefaultTheme());

    // Primary palette
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(css).toContain(`--color-primary-${step}:`);
      expect(css).toContain(`--color-accent-${step}:`);
    }

    // Direct colours
    expect(css).toContain('--color-border:');
    expect(css).toContain('--color-page-bg:');
    expect(css).toContain('--color-card-bg:');
    expect(css).toContain('--color-tab-active-bg:');
    expect(css).toContain('--color-tab-inactive-bg:');
    expect(css).toContain('--color-control-bg:');
    expect(css).toContain('--color-success:');
    expect(css).toContain('--color-warning:');
    expect(css).toContain('--color-error:');
    expect(css).toContain('--color-btn-primary:');
    expect(css).toContain('--color-btn-secondary:');
    expect(css).toContain('--color-btn-new-song:');
    expect(css).toContain('--color-translation-toggle:');

    // Karaoke
    expect(css).toContain('--karaoke-active-color:');
    expect(css).toContain('--karaoke-read-color:');
    expect(css).toContain('--karaoke-unread-color:');
    expect(css).toContain('--karaoke-active-size:');
    expect(css).toContain('--karaoke-read-size:');
    expect(css).toContain('--karaoke-unread-size:');

    // Typography
    expect(css).toContain('--font-headline:');
    expect(css).toContain('--font-headline-weight:');
    expect(css).toContain('--font-copy:');
    expect(css).toContain('--font-copy-weight:');
    expect(css).toContain('--font-label:');
    expect(css).toContain('--font-label-weight:');
    expect(css).toContain('--font-song-line:');
    expect(css).toContain('--font-song-line-weight:');
    expect(css).toContain('--font-song-line-size:');
    expect(css).toContain('--font-translation-line:');
    expect(css).toContain('--font-translation-line-weight:');
    expect(css).toContain('--font-translation-line-size:');

    // App name
    expect(css).toContain('--app-name:');
  });

  it('uses primary palette for accent when accent is null', () => {
    const theme = getDefaultTheme();
    theme.colors.accent = null;
    const css = themeToCssVars(theme);

    // Extract primary-500 and accent-500 values
    const primaryMatch = css.match(/--color-primary-500:\s*([^;]+);/);
    const accentMatch = css.match(/--color-accent-500:\s*([^;]+);/);
    expect(primaryMatch).not.toBeNull();
    expect(accentMatch).not.toBeNull();
    expect(primaryMatch![1]).toBe(accentMatch![1]);
  });

  it('uses separate accent palette when accent is set', () => {
    const theme = getDefaultTheme();
    theme.colors.accent = '#3b82f6';
    const css = themeToCssVars(theme);

    const primaryMatch = css.match(/--color-primary-500:\s*([^;]+);/);
    const accentMatch = css.match(/--color-accent-500:\s*([^;]+);/);
    expect(primaryMatch![1]).not.toBe(accentMatch![1]);
  });
});

// ---------------------------------------------------------------------------
// cssVarsToStyleObject
// ---------------------------------------------------------------------------

describe('cssVarsToStyleObject', () => {
  it('parses CSS vars string into a style object', () => {
    const css = '--color-primary: #7c3aed; --font-size: 16px;';
    const style = cssVarsToStyleObject(css);
    expect(style['--color-primary']).toBe('#7c3aed');
    expect(style['--font-size']).toBe('16px');
  });

  it('handles empty string', () => {
    expect(cssVarsToStyleObject('')).toEqual({});
  });

  it('round-trips with themeToCssVars', () => {
    const theme = getDefaultTheme();
    const css = themeToCssVars(theme);
    const style = cssVarsToStyleObject(css);
    expect(style['--color-border']).toBe(theme.colors.border);
    expect(style['--app-name']).toBe(`'${theme.appName}'`);
  });
});

// ---------------------------------------------------------------------------
// deriveButtonStates
// ---------------------------------------------------------------------------

describe('deriveButtonStates', () => {
  it('returns valid hex colours', () => {
    const { hover, focus } = deriveButtonStates('#7c3aed');
    expect(validateHexColor(hover)).toBe(true);
    expect(validateHexColor(focus)).toBe(true);
  });

  it('hover is different from base', () => {
    const base = '#7c3aed';
    const { hover } = deriveButtonStates(base);
    expect(hover).not.toBe(base);
  });

  it('focus is different from base', () => {
    const base = '#7c3aed';
    const { focus } = deriveButtonStates(base);
    expect(focus).not.toBe(base);
  });

  it('hover is darker than base', () => {
    const base = '#7c3aed';
    const { hover } = deriveButtonStates(base);
    const baseLightness = hexToHsl(base).l;
    const hoverLightness = hexToHsl(hover).l;
    expect(hoverLightness).toBeLessThan(baseLightness);
  });
});
