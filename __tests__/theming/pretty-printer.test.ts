/**
 * Unit tests for the theme pretty-printer.
 *
 * Covers: prettyPrintTheme, getDescriptions
 * Anforderungen: 8.2, 8.3, 8.4, 10.1, 10.2, 10.3
 */

import { describe, it, expect } from 'vitest';
import { prettyPrintTheme, getDescriptions } from '@/lib/theme/pretty-printer';
import { getDefaultTheme } from '@/lib/theme/serializer';
import type { ThemeColors, ThemeTypography, KaraokeTheme } from '@/lib/theme/types';

const lightConfig = getDefaultTheme();
const darkConfig = {
  ...getDefaultTheme(),
  colors: { ...getDefaultTheme().colors, pageBg: '#111827', cardBg: '#1f2937' },
};

const sampleTheme = { name: 'Test Theme', lightConfig, darkConfig };

// ---------------------------------------------------------------------------
// getDescriptions
// ---------------------------------------------------------------------------

describe('getDescriptions', () => {
  it('returns descriptions for appName, colors, typography, and karaoke', () => {
    const desc = getDescriptions();
    expect(typeof desc.appName).toBe('string');
    expect(desc.appName.length).toBeGreaterThan(0);
    expect(typeof desc.colors).toBe('object');
    expect(typeof desc.typography).toBe('object');
    expect(typeof desc.karaoke).toBe('object');
  });

  it('has a description for every color key', () => {
    const desc = getDescriptions();
    const colorKeys: (keyof ThemeColors)[] = [
      'primary', 'accent', 'border', 'pageBg', 'cardBg', 'tabActiveBg',
      'tabInactiveBg', 'controlBg', 'success', 'warning', 'error',
      'primaryButton', 'secondaryButton', 'newSongButton', 'translationToggle',
      'info', 'neutral',
    ];
    for (const key of colorKeys) {
      expect(desc.colors[key]).toBeDefined();
      expect(desc.colors[key].length).toBeGreaterThan(0);
    }
  });

  it('has a description for every typography key', () => {
    const desc = getDescriptions();
    const typoKeys: (keyof ThemeTypography)[] = [
      'headlineFont', 'headlineWeight', 'copyFont', 'copyWeight',
      'labelFont', 'labelWeight', 'songLineFont', 'songLineWeight',
      'songLineSize', 'translationLineFont', 'translationLineWeight',
      'translationLineSize',
    ];
    for (const key of typoKeys) {
      expect(desc.typography[key]).toBeDefined();
      expect(desc.typography[key].length).toBeGreaterThan(0);
    }
  });

  it('has a description for every karaoke key', () => {
    const desc = getDescriptions();
    const karaokeKeys: (keyof KaraokeTheme)[] = [
      'activeLineColor', 'readLineColor', 'unreadLineColor',
      'activeLineSize', 'readLineSize', 'unreadLineSize',
      'bgFrom', 'bgVia', 'bgTo',
    ];
    for (const key of karaokeKeys) {
      expect(desc.karaoke[key]).toBeDefined();
      expect(desc.karaoke[key].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// prettyPrintTheme
// ---------------------------------------------------------------------------

describe('prettyPrintTheme', () => {
  it('returns valid JSON', () => {
    const output = prettyPrintTheme(sampleTheme);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('contains version, name, light, and dark fields', () => {
    const parsed = JSON.parse(prettyPrintTheme(sampleTheme));
    expect(parsed.version).toBe(1);
    expect(parsed.name).toBe('Test Theme');
    expect(parsed.light).toBeDefined();
    expect(parsed.dark).toBeDefined();
  });

  it('output is formatted with indentation and line breaks', () => {
    const output = prettyPrintTheme(sampleTheme);
    expect(output).toContain('\n');
    expect(output).toContain('  ');
  });

  it('every config value in light has a description field', () => {
    const parsed = JSON.parse(prettyPrintTheme(sampleTheme));
    const light = parsed.light;

    // appName
    expect(light.appName.description).toBeDefined();
    expect(light.appName.description.length).toBeGreaterThan(0);

    // colors
    for (const key of Object.keys(light.colors)) {
      expect(light.colors[key].description).toBeDefined();
      expect(light.colors[key].description.length).toBeGreaterThan(0);
    }

    // typography
    for (const key of Object.keys(light.typography)) {
      expect(light.typography[key].description).toBeDefined();
      expect(light.typography[key].description.length).toBeGreaterThan(0);
    }

    // karaoke
    for (const key of Object.keys(light.karaoke)) {
      expect(light.karaoke[key].description).toBeDefined();
      expect(light.karaoke[key].description.length).toBeGreaterThan(0);
    }
  });

  it('every config value in dark has a description field', () => {
    const parsed = JSON.parse(prettyPrintTheme(sampleTheme));
    const dark = parsed.dark;

    expect(dark.appName.description.length).toBeGreaterThan(0);

    for (const key of Object.keys(dark.colors)) {
      expect(dark.colors[key].description.length).toBeGreaterThan(0);
    }
    for (const key of Object.keys(dark.typography)) {
      expect(dark.typography[key].description.length).toBeGreaterThan(0);
    }
    for (const key of Object.keys(dark.karaoke)) {
      expect(dark.karaoke[key].description.length).toBeGreaterThan(0);
    }
  });

  it('preserves the actual config values', () => {
    const parsed = JSON.parse(prettyPrintTheme(sampleTheme));
    expect(parsed.light.appName.value).toBe('Lyco');
    expect(parsed.light.colors.primary.value).toBe('#7c3aed');
    expect(parsed.light.colors.accent.value).toBeNull();
    expect(parsed.dark.colors.pageBg.value).toBe('#111827');
  });
});
