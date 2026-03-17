/**
 * Edge-case unit tests for the theme system.
 *
 * Validates: Requirements 1.3, 3.4, 15.3
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultTheme,
  deserializeTheme,
  serializeTheme,
  themeToCssVars,
} from '@/lib/theme/serializer';
import type { ThemeConfig } from '@/lib/theme/types';

// ---------------------------------------------------------------------------
// 1.3 – Empty app name → fallback to "Song Text Trainer"
// ---------------------------------------------------------------------------

describe('Empty app name fallback (Req 1.3)', () => {
  it('deserializing a theme with empty appName falls back to "Song Text Trainer"', () => {
    const theme = getDefaultTheme();
    theme.appName = '';
    const json = serializeTheme(theme);
    const restored = deserializeTheme(json);
    expect(restored.appName).toBe('Song Text Trainer');
  });

  it('CSS vars use the fallback name when appName was empty', () => {
    const theme = getDefaultTheme();
    theme.appName = '';
    const json = serializeTheme(theme);
    const restored = deserializeTheme(json);
    const css = themeToCssVars(restored);
    expect(css).toContain("--app-name: 'Song Text Trainer';");
  });
});

// ---------------------------------------------------------------------------
// 3.4 – Null accent color → fallback to primary color
// ---------------------------------------------------------------------------

describe('Null accent color fallback (Req 3.4)', () => {
  it('accent palette equals primary palette when accent is null', () => {
    const theme = getDefaultTheme();
    theme.colors.accent = null;
    const css = themeToCssVars(theme);

    // Every primary step should have a matching accent step with the same value
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      const primaryRe = new RegExp(`--color-primary-${step}:\\s*([^;]+);`);
      const accentRe = new RegExp(`--color-accent-${step}:\\s*([^;]+);`);
      const pMatch = css.match(primaryRe);
      const aMatch = css.match(accentRe);
      expect(pMatch).not.toBeNull();
      expect(aMatch).not.toBeNull();
      expect(pMatch![1]).toBe(aMatch![1]);
    }
  });

  it('null accent survives a serialize/deserialize round-trip', () => {
    const theme = getDefaultTheme();
    theme.colors.accent = null;
    const restored = deserializeTheme(serializeTheme(theme));
    expect(restored.colors.accent).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 15.3 – No theme config in DB → default theme
// ---------------------------------------------------------------------------

describe('No theme config in DB → default theme (Req 15.3)', () => {
  it('getDefaultTheme returns a complete ThemeConfig', () => {
    const theme = getDefaultTheme();
    expect(theme.appName).toBeDefined();
    expect(theme.colors).toBeDefined();
    expect(theme.typography).toBeDefined();
    expect(theme.karaoke).toBeDefined();
  });

  it('default theme has the documented primary color', () => {
    const theme = getDefaultTheme();
    expect(theme.colors.primary).toBe('#7c3aed');
  });

  it('default theme accent is null (falls back to primary)', () => {
    const theme = getDefaultTheme();
    expect(theme.colors.accent).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 15.3 – Invalid JSON in DB → default theme
// ---------------------------------------------------------------------------

describe('Invalid JSON in DB → default theme (Req 15.3)', () => {
  it('returns default theme for completely invalid JSON', () => {
    expect(deserializeTheme('not-json')).toEqual(getDefaultTheme());
  });

  it('returns default theme for empty string', () => {
    expect(deserializeTheme('')).toEqual(getDefaultTheme());
  });

  it('returns default theme for JSON null', () => {
    expect(deserializeTheme('null')).toEqual(getDefaultTheme());
  });

  it('returns default theme for JSON array', () => {
    expect(deserializeTheme('[]')).toEqual(getDefaultTheme());
  });

  it('returns default theme for JSON number', () => {
    expect(deserializeTheme('42')).toEqual(getDefaultTheme());
  });
});

// ---------------------------------------------------------------------------
// Default theme produces expected CSS variables
// ---------------------------------------------------------------------------

describe('Default theme produces expected CSS variables', () => {
  const css = themeToCssVars(getDefaultTheme());

  it('contains primary palette variables', () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(css).toContain(`--color-primary-${step}:`);
    }
  });

  it('contains accent palette variables', () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      expect(css).toContain(`--color-accent-${step}:`);
    }
  });

  it('contains direct color variables with default values', () => {
    expect(css).toContain('--color-border: #e5e7eb;');
    expect(css).toContain('--color-page-bg: #f9fafb;');
    expect(css).toContain('--color-card-bg: #ffffff;');
    expect(css).toContain('--color-success: #22c55e;');
    expect(css).toContain('--color-warning: #f97316;');
    expect(css).toContain('--color-error: #ef4444;');
  });

  it('contains typography variables', () => {
    expect(css).toContain('--font-headline:');
    expect(css).toContain('--font-headline-weight: 700;');
    expect(css).toContain('--font-copy-weight: 400;');
    expect(css).toContain('--font-song-line-size: 16px;');
    expect(css).toContain('--font-translation-line-size: 14px;');
  });

  it('contains karaoke variables with default values', () => {
    expect(css).toContain('--karaoke-active-size: 28px;');
    expect(css).toContain('--karaoke-active-color: #ffffff;');
  });

  it('contains the default app name', () => {
    expect(css).toContain("--app-name: 'Lyco';");
  });
});
