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
      info: '#eab308',
      neutral: '#6b7280',
      headlineColor: '#111827',
      copyColor: '#374151',
      labelColor: '#4b5563',
      linkColor: '#7c3aed',
      mutedColor: '#6b7280',
      buttonTextColor: '#ffffff',
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
      bgFrom: '#312e81',
      bgVia: '#581c87',
      bgTo: '#0f172a',
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
    info: hexField('info'),
    neutral: hexField('neutral'),
    headlineColor: hexField('headlineColor'),
    copyColor: hexField('copyColor'),
    labelColor: hexField('labelColor'),
    linkColor: hexField('linkColor'),
    mutedColor: hexField('mutedColor'),
    buttonTextColor: hexField('buttonTextColor'),
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
    bgFrom: colorField('bgFrom'),
    bgVia: colorField('bgVia'),
    bgTo: colorField('bgTo'),
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

  // Generate newSongButton palette (used for general action buttons / links)
  const newSongPalette = generatePalette(config.colors.newSongButton);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-newsong-${step}: ${newSongPalette[step]};`);
  }

  // Generate success palette
  const successPalette = generatePalette(config.colors.success);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-success-${step}: ${successPalette[step]};`);
  }

  // Generate warning palette
  const warningPalette = generatePalette(config.colors.warning);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-warning-${step}: ${warningPalette[step]};`);
  }

  // Generate error palette
  const errorPalette = generatePalette(config.colors.error);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-error-${step}: ${errorPalette[step]};`);
  }

  // Generate info palette
  const infoPalette = generatePalette(config.colors.info);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-info-${step}: ${infoPalette[step]};`);
  }

  // Generate neutral palette
  const neutralPalette = generatePalette(config.colors.neutral);
  for (const step of PALETTE_STEPS) {
    lines.push(`--color-neutral-${step}: ${neutralPalette[step]};`);
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
  lines.push(`--color-info: ${config.colors.info};`);
  lines.push(`--color-btn-primary: ${config.colors.primaryButton};`);
  lines.push(`--color-btn-secondary: ${config.colors.secondaryButton};`);
  lines.push(`--color-btn-new-song: ${config.colors.newSongButton};`);
  lines.push(`--color-translation-toggle: ${config.colors.translationToggle};`);

  // Text colours
  lines.push(`--color-headline-text: ${config.colors.headlineColor};`);
  lines.push(`--color-copy-text: ${config.colors.copyColor};`);
  lines.push(`--color-label-text: ${config.colors.labelColor};`);
  lines.push(`--color-link-text: ${config.colors.linkColor};`);
  lines.push(`--color-muted-text: ${config.colors.mutedColor};`);
  lines.push(`--color-button-text: ${config.colors.buttonTextColor};`);

  // Karaoke
  lines.push(`--karaoke-active-color: ${config.karaoke.activeLineColor};`);
  lines.push(`--karaoke-read-color: ${config.karaoke.readLineColor};`);
  lines.push(`--karaoke-unread-color: ${config.karaoke.unreadLineColor};`);
  lines.push(`--karaoke-active-size: ${config.karaoke.activeLineSize};`);
  lines.push(`--karaoke-read-size: ${config.karaoke.readLineSize};`);
  lines.push(`--karaoke-unread-size: ${config.karaoke.unreadLineSize};`);
  lines.push(`--karaoke-bg-from: ${config.karaoke.bgFrom};`);
  lines.push(`--karaoke-bg-via: ${config.karaoke.bgVia};`);
  lines.push(`--karaoke-bg-to: ${config.karaoke.bgTo};`);

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

// ---------------------------------------------------------------------------
// Theme_JSON deserialization and validation (Anforderungen: 9.2, 9.3, 9.5, 10.4, 11.2)
// ---------------------------------------------------------------------------

/** The currently supported Theme_JSON format version. */
const THEME_JSON_VERSION = 1;

/**
 * Extracts the plain value from an annotated value or a plain value.
 * Handles both `{ value: "...", description: "..." }` and plain `"..."` formats.
 */
function extractValue(raw: unknown): unknown {
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return (raw as Record<string, unknown>).value;
  }
  return raw;
}

/**
 * Extracts a flat record of plain values from an annotated section object.
 * Each key's value is unwrapped from AnnotatedValue format if needed.
 */
function extractSection(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (key === 'description') continue;
    result[key] = extractValue(obj[key]);
  }
  return result;
}

/**
 * Converts an annotated variant section (light/dark from Theme_JSON) into
 * a plain ThemeConfig by unwrapping AnnotatedValue wrappers and ignoring
 * description fields.
 */
function variantToThemeConfig(variant: unknown): ThemeConfig {
  if (typeof variant !== 'object' || variant === null) {
    return getDefaultTheme();
  }

  const obj = variant as Record<string, unknown>;
  const defaults = getDefaultTheme();

  // Extract appName (may be annotated or plain)
  const rawAppName = extractValue(obj.appName);
  const appName = typeof rawAppName === 'string'
    ? (rawAppName === '' ? defaults.appName : rawAppName.slice(0, APP_NAME_MAX_LENGTH))
    : defaults.appName;

  // Extract sub-sections
  const colorsRaw = extractSection(obj.colors);
  const typographyRaw = extractSection(obj.typography);
  const karaokeRaw = extractSection(obj.karaoke);

  // Reuse existing validation helpers
  const colors = validateColors(colorsRaw, defaults.colors);
  const typography = validateTypography(typographyRaw, defaults.typography);
  const karaoke = validateKaraoke(karaokeRaw, defaults.karaoke);

  return { appName, colors, typography, karaoke };
}

/**
 * Deserializes a Theme_JSON string (the export format with version, name,
 * light, dark sections). Ignores `description` fields and extracts only
 * the `value` fields from the AnnotatedValue format.
 *
 * @returns `{ name, lightConfig, darkConfig }` with fully validated ThemeConfig objects.
 * @throws Error if the JSON string cannot be parsed.
 */
export function deserializeThemeJson(json: string): {
  name: string;
  lightConfig: ThemeConfig;
  darkConfig: ThemeConfig;
} {
  const parsed = JSON.parse(json);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Theme_JSON muss ein Objekt sein');
  }

  const obj = parsed as Record<string, unknown>;

  const name = typeof obj.name === 'string' ? obj.name : '';
  const lightConfig = variantToThemeConfig(obj.light);
  const darkConfig = variantToThemeConfig(obj.dark);

  return { name, lightConfig, darkConfig };
}

// ---------------------------------------------------------------------------
// Color keys that must contain valid hex values
// ---------------------------------------------------------------------------

/** Color fields that require valid hex (#RRGGBB) values. */
const HEX_COLOR_KEYS: (keyof ThemeColors)[] = [
  'primary', 'border', 'pageBg', 'cardBg', 'tabActiveBg', 'tabInactiveBg',
  'controlBg', 'success', 'warning', 'error', 'primaryButton',
  'secondaryButton', 'newSongButton', 'translationToggle', 'info', 'neutral',
  'headlineColor', 'copyColor', 'labelColor', 'linkColor', 'mutedColor', 'buttonTextColor',
];

/**
 * Validates hex colors within an annotated variant section.
 * Returns an array of error strings for invalid colors.
 */
function validateVariantColors(variant: unknown, variantLabel: string): string[] {
  const errors: string[] = [];
  if (typeof variant !== 'object' || variant === null) return errors;

  const obj = variant as Record<string, unknown>;
  const colorsRaw = obj.colors;
  if (typeof colorsRaw !== 'object' || colorsRaw === null) return errors;

  const colors = colorsRaw as Record<string, unknown>;
  for (const key of HEX_COLOR_KEYS) {
    const raw = colors[key];
    if (raw === undefined) continue;
    const val = extractValue(raw);
    if (typeof val === 'string' && val.length > 0 && !isValidHex(val)) {
      errors.push(`${variantLabel}.colors.${key}: Ungültiger Hex-Farbwert "${val}"`);
    }
  }

  // Check accent separately (can be null)
  const accentRaw = colors.accent;
  if (accentRaw !== undefined) {
    const accentVal = extractValue(accentRaw);
    if (accentVal !== null && typeof accentVal === 'string' && accentVal.length > 0 && !isValidHex(accentVal)) {
      errors.push(`${variantLabel}.colors.accent: Ungültiger Hex-Farbwert "${accentVal}"`);
    }
  }

  return errors;
}

/**
 * Validates a Theme_JSON string. Checks for required fields (version, name,
 * light, dark), validates hex colors, and checks version number compatibility.
 *
 * @returns `{ valid, errors }` where `errors` contains descriptive messages
 *          for each validation failure.
 */
export function validateThemeJson(json: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { valid: false, errors: ['Ungültiges JSON-Format'] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['Theme_JSON muss ein Objekt sein'] };
  }

  const obj = parsed as Record<string, unknown>;

  // Check required fields
  if (!('version' in obj)) {
    errors.push('Pflichtfeld "version" fehlt');
  }
  if (!('name' in obj)) {
    errors.push('Pflichtfeld "name" fehlt');
  }
  if (!('light' in obj)) {
    errors.push('Pflichtfeld "light" fehlt');
  }
  if (!('dark' in obj)) {
    errors.push('Pflichtfeld "dark" fehlt');
  }

  // Validate version
  if ('version' in obj) {
    if (typeof obj.version !== 'number') {
      errors.push('Feld "version" muss eine Zahl sein');
    } else if (obj.version !== THEME_JSON_VERSION) {
      errors.push(`Inkompatible Theme-JSON-Version: ${obj.version} (erwartet: ${THEME_JSON_VERSION})`);
    }
  }

  // Validate name
  if ('name' in obj) {
    if (typeof obj.name !== 'string') {
      errors.push('Feld "name" muss ein String sein');
    } else if (obj.name.trim().length === 0) {
      errors.push('Feld "name" darf nicht leer sein');
    }
  }

  // Validate light section
  if ('light' in obj) {
    if (typeof obj.light !== 'object' || obj.light === null) {
      errors.push('Feld "light" muss ein Objekt sein');
    } else {
      errors.push(...validateVariantColors(obj.light, 'light'));
    }
  }

  // Validate dark section
  if ('dark' in obj) {
    if (typeof obj.dark !== 'object' || obj.dark === null) {
      errors.push('Feld "dark" muss ein Objekt sein');
    } else {
      errors.push(...validateVariantColors(obj.dark, 'dark'));
    }
  }

  return { valid: errors.length === 0, errors };
}
