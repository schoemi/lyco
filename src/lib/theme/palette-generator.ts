/**
 * Colour palette generator.
 *
 * Converts a single hex base colour into an 11-step palette (50–950)
 * by manipulating lightness and saturation in the HSL colour space.
 *
 * Anforderungen: 2.2, 2.3, 3.2
 */

import type { PaletteStep } from './types';

// ---------------------------------------------------------------------------
// Hex validation
// ---------------------------------------------------------------------------

/** Returns `true` when `hex` is a valid 6-digit hex colour string (#RRGGBB). */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

// ---------------------------------------------------------------------------
// Colour-space conversions
// ---------------------------------------------------------------------------

/**
 * Convert a hex colour string (#RRGGBB) to HSL.
 * Returns h in [0, 360), s and l in [0, 100].
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    // Achromatic
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}


/**
 * Convert HSL values to a hex colour string (#rrggbb).
 * Expects h in [0, 360), s and l in [0, 100].
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r: number, g: number, b: number;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// Palette generation
// ---------------------------------------------------------------------------

/**
 * Target lightness values for each palette step.
 * Step 500 uses the base colour's own lightness.
 */
const LIGHTNESS_MAP: Record<PaletteStep, number | null> = {
  50: 95,
  100: 90,
  200: 82,
  300: 72,
  400: 62,
  500: null, // base colour – keep original lightness
  600: 38,
  700: 30,
  800: 22,
  900: 15,
  950: 10,
};

/**
 * Saturation adjustment factor per step.
 * Lighter steps reduce saturation slightly; darker steps increase it.
 */
const SATURATION_FACTOR: Record<PaletteStep, number> = {
  50: 0.70,
  100: 0.75,
  200: 0.80,
  300: 0.85,
  400: 0.92,
  500: 1.00,
  600: 1.05,
  700: 1.08,
  800: 1.10,
  900: 1.12,
  950: 1.15,
};

/**
 * Generate an 11-step colour palette from a hex base colour.
 *
 * Step 500 equals the base colour. Steps 50–400 are progressively lighter
 * with slightly reduced saturation. Steps 600–950 are progressively darker
 * with slightly increased saturation.
 *
 * @param baseHex – A valid hex colour string (#RRGGBB).
 * @returns A record mapping each PaletteStep to a hex colour string.
 */
export function generatePalette(
  baseHex: string,
): Record<PaletteStep, string> {
  const { h, s, l } = hexToHsl(baseHex);

  const palette = {} as Record<PaletteStep, string>;

  for (const stepStr of Object.keys(LIGHTNESS_MAP)) {
    const step = Number(stepStr) as PaletteStep;
    const targetL = LIGHTNESS_MAP[step];
    const satFactor = SATURATION_FACTOR[step];

    if (targetL === null) {
      // Step 500 – use the original colour exactly
      palette[step] = baseHex.toLowerCase();
    } else {
      const adjustedS = Math.min(100, s * satFactor);
      palette[step] = hslToHex(h, adjustedS, targetL);
    }
  }

  return palette;
}
