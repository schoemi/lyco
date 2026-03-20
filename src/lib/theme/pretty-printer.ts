/**
 * Theme Pretty-Printer – erzeugt formatiertes Theme_JSON mit semantischen
 * Beschreibungen für jede Konfigurationseinstellung.
 *
 * Anforderungen: 8.2, 8.3, 8.4, 10.1, 10.2, 10.3
 */

import type { ThemeConfig, ThemeColors, ThemeTypography, KaraokeTheme } from './types';

// ---------------------------------------------------------------------------
// Annotated value type (matches AnnotatedThemeConfig from design)
// ---------------------------------------------------------------------------

interface AnnotatedValue {
  value: string | null;
  description: string;
}

// ---------------------------------------------------------------------------
// Semantic descriptions (German) for every ThemeConfig field
// ---------------------------------------------------------------------------

const APP_NAME_DESCRIPTION =
  'Der angezeigte Anwendungsname in der Kopfzeile und im Browser-Tab';

const COLOR_DESCRIPTIONS: Record<keyof ThemeColors, string> = {
  primary:
    'Primärfarbe der Anwendung – wird für die Hauptpalette (50–950) generiert, beeinflusst Buttons, Links und Akzente',
  accent:
    'Akzentfarbe – wird für eine sekundäre Palette generiert. Wenn null, wird die Primärfarbe als Fallback verwendet',
  border:
    'Rahmenfarbe für Karten, Eingabefelder und Trennlinien',
  pageBg:
    'Hintergrundfarbe der gesamten Seite – sollte bei der Light-Variante hell und bei der Dark-Variante dunkel sein',
  cardBg:
    'Hintergrundfarbe der Song-Cards und anderer Karten-Elemente in der Übersicht, beeinflusst die Lesbarkeit des Songtitels',
  tabActiveBg:
    'Hintergrundfarbe des aktiven Tabs in der Navigation',
  tabInactiveBg:
    'Hintergrundfarbe inaktiver Tabs in der Navigation',
  controlBg:
    'Hintergrundfarbe von Steuerelementen wie Toggles, Selects und Eingabefeldern',
  success:
    'Farbe für Erfolgs- und Korrekt-Anzeigen, z.B. richtige Antworten im Lückentext',
  warning:
    'Farbe für Warnungen und aktive Indikatoren',
  error:
    'Farbe für Fehler- und Falsch-Anzeigen, z.B. falsche Antworten im Lückentext',
  primaryButton:
    'Hintergrundfarbe des primären Aktions-Buttons',
  secondaryButton:
    'Hintergrundfarbe sekundärer Buttons und Methoden-Buttons',
  newSongButton:
    'Hintergrundfarbe des „Neuer Song"-Buttons und allgemeiner Aktions-Links',
  pillTag:
    'Basisfarbe für Pill-/Tag-Elemente wie Set-Zuordnungen, Emotions-Tags und Badges',
  translationToggle:
    'Farbe des Übersetzungs-Toggle-Schalters',
  info:
    'Farbe für informative Hinweise und Tipps',
  neutral:
    'Neutrale Basisfarbe für Text, Rahmen und Hintergründe – wird für die Neutral-Palette generiert',
  headlineColor:
    'Textfarbe für Überschriften und Seitentitel',
  copyColor:
    'Textfarbe für Fließtext, Beschreibungen und allgemeine Inhalte',
  labelColor:
    'Textfarbe für Labels, Beschriftungen und Formularfelder',
  linkColor:
    'Textfarbe für Links und klickbare Textelemente',
  mutedColor:
    'Textfarbe für sekundäre Informationen wie Künstlername, Hinweise und Zeitangaben',
  buttonTextColor:
    'Textfarbe auf primären Buttons und Aktions-Schaltflächen',
  iconColor:
    'Einheitliche Farbe für alle Icons in der Anwendung',
};

const TYPOGRAPHY_DESCRIPTIONS: Record<keyof ThemeTypography, string> = {
  headlineFont:
    'Schriftfamilie für Überschriften (CSS font-family)',
  headlineWeight:
    'Schriftstärke für Überschriften (CSS font-weight, 100–900)',
  copyFont:
    'Schriftfamilie für Fließtext und Beschreibungen',
  copyWeight:
    'Schriftstärke für Fließtext (CSS font-weight, 100–900)',
  labelFont:
    'Schriftfamilie für Labels und Beschriftungen',
  labelWeight:
    'Schriftstärke für Labels (CSS font-weight, 100–900)',
  songLineFont:
    'Schriftfamilie für Songtext-Zeilen in der Übungsansicht',
  songLineWeight:
    'Schriftstärke für Songtext-Zeilen (CSS font-weight, 100–900)',
  songLineSize:
    'Schriftgröße für Songtext-Zeilen (z.B. "16px")',
  translationLineFont:
    'Schriftfamilie für Übersetzungszeilen unter dem Songtext',
  translationLineWeight:
    'Schriftstärke für Übersetzungszeilen (CSS font-weight, 100–900)',
  translationLineSize:
    'Schriftgröße für Übersetzungszeilen (z.B. "14px")',
};

const KARAOKE_DESCRIPTIONS: Record<keyof KaraokeTheme, string> = {
  activeLineColor:
    'Textfarbe der aktuell aktiven Zeile im Karaoke-Lesemodus',
  readLineColor:
    'Textfarbe bereits gelesener Zeilen im Karaoke-Lesemodus',
  unreadLineColor:
    'Textfarbe noch nicht gelesener Zeilen im Karaoke-Lesemodus',
  activeLineSize:
    'Schriftgröße der aktiven Zeile im Karaoke-Lesemodus (14px–48px)',
  readLineSize:
    'Schriftgröße bereits gelesener Zeilen im Karaoke-Lesemodus',
  unreadLineSize:
    'Schriftgröße noch nicht gelesener Zeilen im Karaoke-Lesemodus',
  bgFrom:
    'Startfarbe (oben links) des Hintergrund-Farbverlaufs im Karaoke-Lesemodus',
  bgVia:
    'Mittelfarbe des Hintergrund-Farbverlaufs im Karaoke-Lesemodus',
  bgTo:
    'Endfarbe (unten rechts) des Hintergrund-Farbverlaufs im Karaoke-Lesemodus',
};


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the complete description map for all theme settings.
 * Useful for UI tooltips or documentation generation.
 */
export function getDescriptions(): {
  appName: string;
  colors: Record<keyof ThemeColors, string>;
  typography: Record<keyof ThemeTypography, string>;
  karaoke: Record<keyof KaraokeTheme, string>;
} {
  return {
    appName: APP_NAME_DESCRIPTION,
    colors: { ...COLOR_DESCRIPTIONS },
    typography: { ...TYPOGRAPHY_DESCRIPTIONS },
    karaoke: { ...KARAOKE_DESCRIPTIONS },
  };
}

// ---------------------------------------------------------------------------
// Annotated section builders
// ---------------------------------------------------------------------------

function annotate(value: string | null, description: string): AnnotatedValue {
  return { value, description };
}

function annotateColors(colors: ThemeColors): Record<keyof ThemeColors, AnnotatedValue> {
  const result = {} as Record<keyof ThemeColors, AnnotatedValue>;
  for (const key of Object.keys(COLOR_DESCRIPTIONS) as (keyof ThemeColors)[]) {
    result[key] = annotate(colors[key], COLOR_DESCRIPTIONS[key]);
  }
  return result;
}

function annotateTypography(typography: ThemeTypography): Record<keyof ThemeTypography, AnnotatedValue> {
  const result = {} as Record<keyof ThemeTypography, AnnotatedValue>;
  for (const key of Object.keys(TYPOGRAPHY_DESCRIPTIONS) as (keyof ThemeTypography)[]) {
    result[key] = annotate(typography[key], TYPOGRAPHY_DESCRIPTIONS[key]);
  }
  return result;
}

function annotateKaraoke(karaoke: KaraokeTheme): Record<keyof KaraokeTheme, AnnotatedValue> {
  const result = {} as Record<keyof KaraokeTheme, AnnotatedValue>;
  for (const key of Object.keys(KARAOKE_DESCRIPTIONS) as (keyof KaraokeTheme)[]) {
    result[key] = annotate(karaoke[key], KARAOKE_DESCRIPTIONS[key]);
  }
  return result;
}

function annotateVariant(config: ThemeConfig) {
  return {
    appName: annotate(config.appName, APP_NAME_DESCRIPTION),
    colors: annotateColors(config.colors),
    typography: annotateTypography(config.typography),
    karaoke: annotateKaraoke(config.karaoke),
  };
}

// ---------------------------------------------------------------------------
// Pretty-print
// ---------------------------------------------------------------------------

/**
 * Produces a formatted Theme_JSON string with semantic descriptions for every
 * configuration value. The output contains `version`, `name`, `light` and
 * `dark` sections as specified in the design document.
 *
 * @param theme Object with `name`, `lightConfig` and `darkConfig`.
 * @returns Formatted JSON string with indentation and line breaks.
 */
export function prettyPrintTheme(theme: {
  name: string;
  lightConfig: ThemeConfig;
  darkConfig: ThemeConfig;
}): string {
  const themeJson = {
    version: 1,
    name: theme.name,
    light: annotateVariant(theme.lightConfig),
    dark: annotateVariant(theme.darkConfig),
  };

  return JSON.stringify(themeJson, null, 2);
}
