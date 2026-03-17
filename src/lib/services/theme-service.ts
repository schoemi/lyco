import { prisma } from "@/lib/prisma";
import {
  serializeTheme,
  deserializeTheme,
  getDefaultTheme,
  validateHexColor,
  validateAppName,
  validateKaraokeFontSize,
  validateFontWeight,
  validateFontFamily,
} from "@/lib/theme/serializer";
import type { ThemeConfig } from "@/lib/theme/types";

const THEME_CONFIG_KEY = "theme-config";

/**
 * Loads the theme configuration from the SystemSetting table.
 * Returns the default theme on any error or missing entry.
 *
 * Anforderungen: 15.1, 15.2, 15.3
 */
export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: THEME_CONFIG_KEY },
    });

    if (!setting) {
      return getDefaultTheme();
    }

    return deserializeTheme(setting.value);
  } catch {
    return getDefaultTheme();
  }
}

/**
 * Validates and saves a theme configuration to the SystemSetting table.
 * Throws on validation failure.
 *
 * Anforderungen: 15.1, 15.2, 15.3
 */
export async function saveThemeConfig(config: ThemeConfig): Promise<void> {
  validateThemeConfig(config);

  const json = serializeTheme(config);

  await prisma.systemSetting.upsert({
    where: { key: THEME_CONFIG_KEY },
    update: { value: json },
    create: { key: THEME_CONFIG_KEY, value: json },
  });
}

/**
 * Validates a ThemeConfig object. Throws an error with a descriptive
 * message if any field is invalid.
 */
function validateThemeConfig(config: ThemeConfig): void {
  // App name
  if (!validateAppName(config.appName)) {
    throw new Error(
      `Invalid appName: must be at most 50 characters, got ${config.appName.length}`
    );
  }

  // Colour fields that must be valid hex
  const hexFields: Array<[string, string]> = [
    ["colors.primary", config.colors.primary],
    ["colors.border", config.colors.border],
    ["colors.pageBg", config.colors.pageBg],
    ["colors.cardBg", config.colors.cardBg],
    ["colors.tabActiveBg", config.colors.tabActiveBg],
    ["colors.tabInactiveBg", config.colors.tabInactiveBg],
    ["colors.controlBg", config.colors.controlBg],
    ["colors.success", config.colors.success],
    ["colors.warning", config.colors.warning],
    ["colors.error", config.colors.error],
    ["colors.primaryButton", config.colors.primaryButton],
    ["colors.secondaryButton", config.colors.secondaryButton],
    ["colors.newSongButton", config.colors.newSongButton],
    ["colors.translationToggle", config.colors.translationToggle],
  ];

  for (const [name, value] of hexFields) {
    if (!validateHexColor(value)) {
      throw new Error(`Invalid hex colour for ${name}: ${value}`);
    }
  }

  // Accent is nullable but must be valid hex when present
  if (config.colors.accent !== null && !validateHexColor(config.colors.accent)) {
    throw new Error(`Invalid hex colour for colors.accent: ${config.colors.accent}`);
  }

  // Typography font families
  const fontFields: Array<[string, string]> = [
    ["typography.headlineFont", config.typography.headlineFont],
    ["typography.copyFont", config.typography.copyFont],
    ["typography.labelFont", config.typography.labelFont],
    ["typography.songLineFont", config.typography.songLineFont],
    ["typography.translationLineFont", config.typography.translationLineFont],
  ];

  for (const [name, value] of fontFields) {
    if (!validateFontFamily(value)) {
      throw new Error(`Invalid font family for ${name}: must be non-empty`);
    }
  }

  // Typography font weights
  const weightFields: Array<[string, string]> = [
    ["typography.headlineWeight", config.typography.headlineWeight],
    ["typography.copyWeight", config.typography.copyWeight],
    ["typography.labelWeight", config.typography.labelWeight],
    ["typography.songLineWeight", config.typography.songLineWeight],
    ["typography.translationLineWeight", config.typography.translationLineWeight],
  ];

  for (const [name, value] of weightFields) {
    if (!validateFontWeight(value)) {
      throw new Error(`Invalid font weight for ${name}: ${value}`);
    }
  }

  // Karaoke active line size (14–48px)
  if (!validateKaraokeFontSize(config.karaoke.activeLineSize)) {
    throw new Error(
      `Invalid karaoke activeLineSize: ${config.karaoke.activeLineSize} (must be 14px–48px)`
    );
  }
}
