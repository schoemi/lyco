/**
 * Theme configuration types and validation constants.
 *
 * Defines the shape of the entire theming system: colors, typography,
 * karaoke view settings, and the top-level ThemeConfig that ties them together.
 */

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

/** Maximum allowed length for the application name (Anforderung 1.4) */
export const APP_NAME_MAX_LENGTH = 50;

/** Minimum font size in px for karaoke active line (Anforderung 12.3) */
export const KARAOKE_FONT_SIZE_MIN = 14;

/** Maximum font size in px for karaoke active line (Anforderung 12.3) */
export const KARAOKE_FONT_SIZE_MAX = 48;

/** Minimum CSS font-weight value */
export const FONT_WEIGHT_MIN = 100;

/** Maximum CSS font-weight value */
export const FONT_WEIGHT_MAX = 900;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/**
 * Valid palette step values generated from a base hex colour.
 * Step 500 equals the base colour; lower steps are lighter, higher steps darker.
 */
export type PaletteStep =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 950;

/** All palette steps as a readonly array – handy for iteration. */
export const PALETTE_STEPS: readonly PaletteStep[] = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

// ---------------------------------------------------------------------------
// Theme colour configuration
// ---------------------------------------------------------------------------

/**
 * All configurable colour slots.
 *
 * `primary` and `accent` are base hex colours from which full 11-step
 * palettes are generated. The remaining fields are direct hex values.
 */
export interface ThemeColors {
  /** Hex base colour – palette is generated from this (Anforderung 2.2) */
  primary: string;
  /** Hex accent colour; null falls back to primary (Anforderung 3.4) */
  accent: string | null;
  /** Border colour for cards, inputs, dividers (Anforderung 4.2) */
  border: string;
  /** Page background colour (Anforderung 5.2) */
  pageBg: string;
  /** Card background colour (Anforderung 5.3) */
  cardBg: string;
  /** Active tab background (Anforderung 6.2) */
  tabActiveBg: string;
  /** Inactive tab background (Anforderung 6.2) */
  tabInactiveBg: string;
  /** Control background (toggles, selects) (Anforderung 6.2) */
  controlBg: string;
  /** Success / correct colour (Anforderung 7.2) */
  success: string;
  /** Warning / active indicator colour (Anforderung 7.2) */
  warning: string;
  /** Error / incorrect colour (Anforderung 7.2) */
  error: string;
  /** Primary action button colour (Anforderung 9.2) */
  primaryButton: string;
  /** Secondary / method button colour (Anforderung 9.2) */
  secondaryButton: string;
  /** "+ Neuer Song" button colour (Anforderung 9.2) */
  newSongButton: string;
  /** Pill / tag background colour for sets, emotions, badges */
  pillTag: string;
  /** Translation toggle colour (Anforderung 9.5) */
  translationToggle: string;
  /** Info / hint colour for informational messages */
  info: string;
  /** Neutral base colour for text, borders, backgrounds (palette generated) */
  neutral: string;
  /** Headline text colour (Anforderung Typografie) */
  headlineColor: string;
  /** Body / copy text colour (Anforderung Typografie) */
  copyColor: string;
  /** Label text colour (Anforderung Typografie) */
  labelColor: string;
  /** Link text colour */
  linkColor: string;
  /** Muted / secondary text colour (e.g. artist name, hints) */
  mutedColor: string;
  /** Text colour on primary buttons */
  buttonTextColor: string;
  /** Monochrome icon colour – one colour for all icons */
  iconColor: string;
}

// ---------------------------------------------------------------------------
// Theme typography configuration
// ---------------------------------------------------------------------------

/** Configurable typography slots for the application (Anforderungen 10, 11). */
export interface ThemeTypography {
  headlineFont: string;
  headlineWeight: string;
  copyFont: string;
  copyWeight: string;
  labelFont: string;
  labelWeight: string;
  songLineFont: string;
  songLineWeight: string;
  songLineSize: string;
  translationLineFont: string;
  translationLineWeight: string;
  translationLineSize: string;
}

// ---------------------------------------------------------------------------
// Karaoke view theme
// ---------------------------------------------------------------------------

/** Colour and size settings for the karaoke reading mode (Anforderungen 8, 12). */
export interface KaraokeTheme {
  /** Colour of the currently active line */
  activeLineColor: string;
  /** Colour of already-read lines */
  readLineColor: string;
  /** Colour of not-yet-read lines */
  unreadLineColor: string;
  /** Font size of the active line (14px–48px) (Anforderung 12.3) */
  activeLineSize: string;
  /** Font size of read lines */
  readLineSize: string;
  /** Font size of unread lines */
  unreadLineSize: string;
  /** Gradient start colour (top-left) for karaoke background */
  bgFrom: string;
  /** Gradient middle colour for karaoke background */
  bgVia: string;
  /** Gradient end colour (bottom-right) for karaoke background */
  bgTo: string;
}

// ---------------------------------------------------------------------------
// Top-level theme configuration
// ---------------------------------------------------------------------------

/**
 * Complete theme configuration object persisted in the database.
 *
 * Serialised as JSON in the `SystemSetting` table (key: `theme-config`).
 */
export interface ThemeConfig {
  /** Displayed application name – max 50 characters (Anforderung 1.4) */
  appName: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  karaoke: KaraokeTheme;
}
