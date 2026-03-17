/**
 * Theme serializer – converts between ThemeConfig objects, JSON strings,
 * and CSS custom properties.
 *
 * Anforderungen: 1.3, 1.4, 3.4, 5.4, 6.3, 8.3, 9.4, 12.3, 15.4, 15.5, 15.6, 16.1, 16.4
 */

import type { ThemeConfig, ThemeColors, ThemeTypography, KaraokeTheme } from './types';
import {
  APP_NAME_MAX_LENGTH,
  KARAOKE_FONT_SIZE_MIN,
  KARAOKE_FONT_SIZE_MAX,
  FONT_WEIGHT_MIN,
  FONT_WEIGHT_MAX,
  PALETTE_STEPS,
} from './types';
import { generatePalette, isValidHex, hexToHsl, hslToHex } from './palette-generator';

// ---------------------------------------------------------------------------
// Default theme
// ---------------------------------------------------------------------------

const DEFAULT_FONT = "'Inter', system-ui, sans-serif";

/** Returns the default theme matching the current Purple/Gray scheme. */
export function getDefaultTheme(): ThemeConfig {
  return {
    appName: 'Lyco',
    colors: {
      primary: '#7c3aed',
      accent: null,
      border: '#e5e7eb',
      pageBg: '#f9fafb',
      cardBg: '#ffffff',
      tabActiveBg: '#7c3aed',
      tabInactiveBg: '#f3f4f6',
      controlBg: '#f3f4f6',
      success: '#22c55e',
      warning: '#f97316',
      error: '#ef4444',
      primaryButton: '#7c3aed',
      secondaryButton: '#3b82f6',
      newSongButton: '#7c3aed',
      translationToggle: '#3b82f6',
    },
    typography: {
      headlineFont: DEFAULT_FONT,
      headlineWeight: '700',
      copyFont: DEFAULT_FONT,
      copyWeight: '400',
      labelFont: DEFAULT_FONT,
      labelWeight: '500',
      songLineFont: DEFAULT_FONT,
      songLineWeight: '400',
      songLineSize: '16px',
      translationLineFont: DEFAULT_FONT,
      translationLineWeight: '400',
      translationLineSize: '14px',
    },
    karaoke: {
      activeLineColor: '#ffffff',
      readLineColor: 'rgba(255,255,255,0.4)',
      unreadLineColor: 'rgba(255,255,255,0.2)',
      activeLineSize: '28px',
      readLineSize: '20px',
      unreadLineSize: '18px',
    },
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Validates a hex colour string (#RRGGBB). */
export function validateHexColor(value: string): boolean {
  return isValidHex(value);
}

/** Validates app name length (1–50 chars). Empty string is allowed (falls back to default). */
export function validateAppName(name: string): boolean {
  return typeof name === 'string' && name.length <= APP_NAME_MAX_LENGTH;
}

/** Validates a karaoke font size string (14px–48px). */
export function validateKaraokeFontSize(size: string): boolean {
  const match = size.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return false;
  const num = parseFloat(match[1]);
  return num >= KARAOKE_FONT_SIZE_MIN && num <= KARAOKE_FONT_SIZE_MAX;
}

/** Validates a CSS font-weight value (100–900). */
export function validateFontWeight(weight: string): boolean {
  const num = parseInt(weight, 10);
  return !isNaN(num) && num >= FONT_WEIGHT_MIN && num <= FONT_WEIGHT_MAX && String(num) === weight;
}

/** Validates a non-empty font string. */
export function validateFontFamily(font: string): boolean {
  return typeof font === 'string' && font.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Serializes a ThemeConfig to a JSON string. */
export function serializeTheme(config: ThemeConfig): string {
  return JSON.stringify(config);
}

/** Deserializes a JSON string to a ThemeConfig with validation. */
export function deserializeTheme(json: string): ThemeConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return getDefaultTheme();
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return getDefaultTheme();
  }

  const obj = parsed as Record<string, unknown>;
  const defaults = getDefaultTheme();

  // Validate and extract appName
  const appName = typeof obj.appName === 'string'
    ? (obj.appName === '' ? 'Song Text Trainer' : obj.appName.slice(0, APP_NAME_MAX_LENGTH))
    : defaults.appName;

  // Validate colors
  const colors = validateColors(obj.colors, defaults.colors);

  // Validate typography
  const typography = validateTypography(obj.typography, defaults.typography);

  // Validate karaoke
  const karaoke = validateKaraoke(obj.karaoke, defaults.karaoke);

  return { appName, colors, typography, karaoke };
}

function validateColors(raw: unknown, defaults: ThemeColors): ThemeColors {
  if (typeof raw !== 'object' || raw === null) return defaults;
  const obj = raw as Record<string, unknown>;

  const hexField = (key: keyof ThemeColors): string => {
    const val = obj[key];
    if (typeof val === 'string' && isValidHex(val)) return val;
    return defaults[key] as string;
  };

  return {
    primary: hexField('primary'),
    accent: obj.accent === null ? null : (typeof obj.accent === 'string' && isValidHex(obj.accent) ? obj.accent : defaults.accent),
    border: hexField('border'),
    pageBg: hexField('pageBg'),
    cardBg: hexField('cardBg'),
    tabActiveBg: hexField('tabActiveBg'),
    tabInactiveBg: hexField('tabInactiveBg'),
    controlBg: hexField('controlBg'),
    success: hexField('success'),
    warning: hexField('warning'),
    error: hexField('error'),
    primaryButton: hexField('primaryButton'),
    secondaryButton: hexField('secondaryButton'),
    newSongButton: hexField('newSongButton'),
    translationToggle: hexField('translationToggle'),
  };
}

function validateTypography(raw: unknown, defaults: ThemeTypography): ThemeTypography {
  if (typeof raw !== 'object' || raw === null) return defaults;
  const obj = raw as Record<string, unknown>;

  const fontField = (key: keyof ThemeTypography): string => {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val;
    return defaults[key];
  };

  const weightField = (key: keyof ThemeTypography): string => {
    const val = obj[key];
    if (typeof val === 'string' && validateFontWeight(val)) return val;
    return defaults[key];
  };

  const sizeField = (key: keyof ThemeTypography): string => {
    const val = obj[key];
    if (typeof val === 'string' && /^\d+(?:\.\d+)?px$/.test(val)) return val;
    return defaults[key];
  };

  return {
    headlineFont: fontField('headlineFont'),
    headlineWeight: weightField('headlineWeight'),
    copyFont: fontField('copyFont'),
    copyWeight: weightField('copyWeight'),
    labelFont: fontField('labelFont'),
    labelWeight: weightField('labelWeight'),
    songLineFont: fontField('songLineFont'),
    songLineWeight: weightField('songLineWeight'),
    songLineSize: sizeField('songLineSize'),
    translationLineFont: fontField('translationLineFont'),
    translationLineWeight: weightField('translationLineWeight'),
    translationLineSize: sizeField('translationLineSize'),
  };
}

function validateKaraoke(raw: unknown, defaults: KaraokeTheme): KaraokeTheme {
  if (typeof raw !== 'object' || raw === null) return defaults;
  const obj = raw as Record<string, unknown>;

  const colorField = (key: keyof KaraokeTheme): string => {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val;
    return defaults[key];
  };

  const sizeField = (key: keyof KaraokeTheme): string => {
    const val = obj[key];
    if (typeof val === 'string' && /^\d+(?:\.\d+)?px$/.test(val)) return val;
    return defaults[key];
  };

  return {
    activeLineColor: colorField('activeLineColor'),
    readLineColor: colorField('readLineColor'),
    unreadLineColor: colorField('unreadLineColor'),
    activeLineSize: sizeField('activeLineSize'),
    readLineSize: sizeField('readLineSize'),
    unreadLineSize: sizeField('unreadLineSize'),
  };
}

// ---------------------------------------------------------------------------
// CSS custom properties
// ---------------------------------------------------------------------------

/**
 * Converts a ThemeConfig to a CSS custom properties string.
 * Generates palettes for primary and accent (falls back to primary if accent is null).
 */
export function themeToCssVars(config: ThemeConfig): string {
  const lines: string[] = [];

  // Generate primary palette
  const primaryPalette = generatePalette(config.colors.primary);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-primary-${step}: ${primaryPalette[step]};`);
  }

  // Generate accent palette (fallback to primary if null)
  const accentBase = config.colors.accent ?? config.colors.primary;
  const accentPalette = generatePalette(accentBase);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-accent-${step}: ${accentPalette[step]};`);
  }

  // Direct colour values
  lines.push(`--color-border: ${config.colors.border};`);
  lines.push(`--color-page-bg: ${config.colors.pageBg};`);
  lines.push(`--color-card-bg: ${config.colors.cardBg};`);
  lines.push(`--color-tab-active-bg: ${config.colors.tabActiveBg};`);
  lines.push(`--color-tab-inactive-bg: ${config.colors.tabInactiveBg};`);
  lines.push(`--color-control-bg: ${config.colors.controlBg};`);
  lines.push(`--color-success: ${config.colors.success};`);
  lines.push(`--color-warning: ${config.colors.warning};`);
  lines.push(`--color-error: ${config.colors.error};`);
  lines.push(`--color-btn-primary: ${config.colors.primaryButton};`);
  lines.push(`--color-btn-secondary: ${config.colors.secondaryButton};`);
  lines.push(`--color-btn-new-song: ${config.colors.newSongButton};`);
  lines.push(`--color-translation-toggle: ${config.colors.translationToggle};`);

  // Karaoke
  lines.push(`--karaoke-active-color: ${config.karaoke.activeLineColor};`);
  lines.push(`--karaoke-read-color: ${config.karaoke.readLineColor};`);
  lines.push(`--karaoke-unread-color: ${config.karaoke.unreadLineColor};`);
  lines.push(`--karaoke-active-size: ${config.karaoke.activeLineSize};`);
  lines.push(`--karaoke-read-size: ${config.karaoke.readLineSize};`);
  lines.push(`--karaoke-unread-size: ${config.karaoke.unreadLineSize};`);

  // Typography
  lines.push(`--font-headline: ${config.typography.headlineFont};`);
  lines.push(`--font-headline-weight: ${config.typography.headlineWeight};`);
  lines.push(`--font-copy: ${config.typography.copyFont};`);
  lines.push(`--font-copy-weight: ${config.typography.copyWeight};`);
  lines.push(`--font-label: ${config.typography.labelFont};`);
  lines.push(`--font-label-weight: ${config.typography.labelWeight};`);
  lines.push(`--font-song-line: ${config.typography.songLineFont};`);
  lines.push(`--font-song-line-weight: ${config.typography.songLineWeight};`);
  lines.push(`--font-song-line-size: ${config.typography.songLineSize};`);
  lines.push(`--font-translation-line: ${config.typography.translationLineFont};`);
  lines.push(`--font-translation-line-weight: ${config.typography.translationLineWeight};`);
  lines.push(`--font-translation-line-size: ${config.typography.translationLineSize};`);

  // App name
  lines.push(`--app-name: '${config.appName}';`);

  return lines.join(' ');
}

/**
 * Converts a CSS custom properties string to a React-compatible style object.
 * Parses `--prop: value;` pairs into `{ '--prop': 'value' }`.
 */
export function cssVarsToStyleObject(cssVars: string): Record<string, string> {
  const style: Record<string, string> = {};
  // Match --property: value; patterns
  const regex = /(--.+?):\s*(.+?);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cssVars)) !== null) {
    style[match[1]] = match[2];
  }
  return style;
}

// ---------------------------------------------------------------------------
// Button state derivation (Anforderung 9.4)
// ---------------------------------------------------------------------------

/**
 * Derives hover and focus hex colours from a base button colour.
 *
 * - Hover: darker than base (lightness reduced by 10%)
 * - Focus: shifted hue by 15° from base
 *
 * Both returned values are valid hex colours different from the base.
 */
export function deriveButtonStates(baseHex: string): { hover: string; focus: string } {
  const { h, s, l } = hexToHsl(baseHex);

  // Hover: reduce lightness by 10 (clamped to 0).
  // For very dark colours the 10-point shift may round to the same hex value,
  // so we keep reducing until the result actually differs from the base.
  let hoverL = Math.max(0, l - 10);
  let hover = hslToHex(h, s, hoverL);
  while (hover.toLowerCase() === baseHex.toLowerCase() && hoverL > 0) {
    hoverL = Math.max(0, hoverL - 5);
    hover = hslToHex(h, s, hoverL);
  }
  // If still identical (base is already black-ish), go lighter instead
  if (hover.toLowerCase() === baseHex.toLowerCase()) {
    hover = hslToHex(h, s, Math.min(100, l + 10));
  }

  // Focus: shift hue by 15° (wrap around 360)
  const focusH = (h + 15) % 360;
  let focus = hslToHex(focusH, s, l);
  // For achromatic colours (s ≈ 0) hue shift has no visible effect,
  // so adjust lightness instead to guarantee a distinct colour.
  if (focus.toLowerCase() === baseHex.toLowerCase()) {
    const focusL = l > 50 ? l - 15 : l + 15;
    focus = hslToHex(h, s, Math.max(0, Math.min(100, focusL)));
  }

  return { hover, focus };
}
