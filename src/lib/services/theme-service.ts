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

// ---------------------------------------------------------------------------
// Default variant configs (matching prisma/seed.ts)
// ---------------------------------------------------------------------------

const DEFAULT_FONT = "'Inter', system-ui, sans-serif";

export function getDefaultLightConfig(): ThemeConfig {
  return getDefaultTheme();
}

export function getDefaultDarkConfig(): ThemeConfig {
  return {
    appName: "Lyco",
    colors: {
      primary: "#a78bfa",
      accent: null,
      border: "#374151",
      pageBg: "#111827",
      cardBg: "#1f2937",
      tabActiveBg: "#a78bfa",
      tabInactiveBg: "#374151",
      controlBg: "#374151",
      success: "#4ade80",
      warning: "#fb923c",
      error: "#f87171",
      primaryButton: "#a78bfa",
      secondaryButton: "#60a5fa",
      newSongButton: "#a78bfa",
      translationToggle: "#60a5fa",
      info: "#facc15",
      neutral: "#9ca3af",
      headlineColor: "#f9fafb",
      copyColor: "#e5e7eb",
      labelColor: "#d1d5db",
      linkColor: "#a78bfa",
      mutedColor: "#9ca3af",
      buttonTextColor: "#ffffff",
    },
    typography: {
      headlineFont: DEFAULT_FONT,
      headlineWeight: "700",
      copyFont: DEFAULT_FONT,
      copyWeight: "400",
      labelFont: DEFAULT_FONT,
      labelWeight: "500",
      songLineFont: DEFAULT_FONT,
      songLineWeight: "400",
      songLineSize: "16px",
      translationLineFont: DEFAULT_FONT,
      translationLineWeight: "400",
      translationLineSize: "14px",
    },
    karaoke: {
      activeLineColor: "#ffffff",
      readLineColor: "rgba(255,255,255,0.5)",
      unreadLineColor: "rgba(255,255,255,0.3)",
      activeLineSize: "28px",
      readLineSize: "20px",
      unreadLineSize: "18px",
      bgFrom: "#1e1b4b",
      bgVia: "#3b0764",
      bgTo: "#020617",
    },
  };
}

// ---------------------------------------------------------------------------
// Theme name validation
// ---------------------------------------------------------------------------

export const THEME_NAME_MAX_LENGTH = 100;

/**
 * Validates a theme name: must be 1–100 characters.
 * Throws an error if invalid.
 */
export function validateThemeName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Theme-Name darf nicht leer sein");
  }
  if (name.length > THEME_NAME_MAX_LENGTH) {
    throw new Error(
      `Theme-Name darf maximal ${THEME_NAME_MAX_LENGTH} Zeichen lang sein, hat aber ${name.length}`
    );
  }
}

// ---------------------------------------------------------------------------
// CRUD functions for Theme model
// ---------------------------------------------------------------------------

/**
 * Returns all themes ordered by creation date.
 *
 * Anforderungen: 4.1
 */
export async function getAllThemes() {
  return prisma.theme.findMany({
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Returns a single theme by ID, or null if not found.
 *
 * Anforderungen: 2.3
 */
export async function getThemeById(id: string) {
  return prisma.theme.findUnique({
    where: { id },
  });
}

/**
 * Creates a new theme with the given name.
 * Automatically generates Light and Dark variants with default values.
 * Validates name uniqueness and length (1–100 chars).
 *
 * Anforderungen: 1.1, 1.2, 1.3, 1.4
 */
export async function createTheme(name: string) {
  validateThemeName(name);

  const existing = await prisma.theme.findUnique({
    where: { name },
  });

  if (existing) {
    throw new Error("Theme-Name existiert bereits");
  }

  return prisma.theme.create({
    data: {
      name,
      lightConfig: JSON.stringify(getDefaultLightConfig()),
      darkConfig: JSON.stringify(getDefaultDarkConfig()),
      isDefault: false,
    },
  });
}

/**
 * Updates an existing theme's name and/or variant configs.
 *
 * Anforderungen: 2.3
 */
export async function updateTheme(
  id: string,
  data: {
    name?: string;
    lightConfig?: ThemeConfig;
    darkConfig?: ThemeConfig;
  }
) {
  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Theme nicht gefunden");
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    validateThemeName(data.name);

    // Check uniqueness only if name actually changed
    if (data.name !== existing.name) {
      const nameConflict = await prisma.theme.findUnique({
        where: { name: data.name },
      });
      if (nameConflict) {
        throw new Error("Theme-Name existiert bereits");
      }
    }
    updateData.name = data.name;
  }

  if (data.lightConfig !== undefined) {
    updateData.lightConfig = JSON.stringify(data.lightConfig);
  }

  if (data.darkConfig !== undefined) {
    updateData.darkConfig = JSON.stringify(data.darkConfig);
  }

  return prisma.theme.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Deletes a theme by ID.
 * - Prevents deletion of the default theme (isDefault: true).
 * - Resets all users who had this theme selected (selectedThemeId = null).
 *
 * Anforderungen: 3.1, 3.2, 3.3, 3.4
 */
export async function deleteTheme(id: string): Promise<void> {
  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Theme nicht gefunden");
  }

  if (existing.isDefault) {
    throw new Error("Standard-Theme kann nicht gelöscht werden");
  }

  // Reset affected users before deleting
  await prisma.user.updateMany({
    where: { selectedThemeId: id },
    data: { selectedThemeId: null },
  });

  await prisma.theme.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Default-theme management
// ---------------------------------------------------------------------------

/**
 * Marks the given theme as the default, removing the flag from the
 * previous default theme (if any).
 *
 * Anforderungen: 4.3
 */
export async function setDefaultTheme(id: string): Promise<void> {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) {
    throw new Error("Theme nicht gefunden");
  }

  await prisma.$transaction([
    // Remove isDefault from the current default(s)
    prisma.theme.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    }),
    // Set isDefault on the new theme
    prisma.theme.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// User theme preference functions
// ---------------------------------------------------------------------------

/**
 * Returns the ThemeConfig for the user's selected variant.
 * Falls back to the default theme's light variant when:
 * - The user has no selectedThemeId
 * - The selected theme no longer exists
 * - The default theme itself is missing (returns hard-coded light defaults)
 *
 * Anforderungen: 6.3, 6.4, 6.5, 7.3, 7.4, 7.5
 */
export async function getUserThemeConfig(userId: string): Promise<ThemeConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { selectedThemeId: true, themeVariant: true },
  });

  // If user has a selected theme, try to load it
  if (user?.selectedThemeId) {
    const theme = await prisma.theme.findUnique({
      where: { id: user.selectedThemeId },
    });

    if (theme) {
      const variant = user.themeVariant === "dark" ? "dark" : "light";
      const configJson = variant === "dark" ? theme.darkConfig : theme.lightConfig;
      return deserializeTheme(configJson);
    }
  }

  // Fallback: default theme, light variant
  const defaultTheme = await prisma.theme.findFirst({
    where: { isDefault: true },
  });

  if (defaultTheme) {
    return deserializeTheme(defaultTheme.lightConfig);
  }

  // Ultimate fallback: hard-coded light defaults
  return getDefaultLightConfig();
}

/**
 * Saves the user's theme preference (selected theme and variant).
 *
 * Anforderungen: 6.3, 7.3
 */
export async function setUserThemePreference(
  userId: string,
  themeId: string,
  variant: "light" | "dark"
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      selectedThemeId: themeId,
      themeVariant: variant,
    },
  });
}

// ---------------------------------------------------------------------------
// Legacy functions (SystemSetting-based, kept for backward compatibility)
// ---------------------------------------------------------------------------

/**
 * Loads the theme configuration for contexts without a user (e.g. SSR,
 * public pages). Resolution order:
 *
 * 1. Default theme from the new `Theme` table (isDefault: true) → light variant
 * 2. Legacy fallback: `SystemSetting` table (key: "theme-config")
 * 3. Ultimate fallback: hard-coded light defaults via `getDefaultLightConfig()`
 *
 * Anforderungen: 6.5, 7.5
 */
export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    // 1. Try the new Theme table first
    const defaultTheme = await prisma.theme.findFirst({
      where: { isDefault: true },
    });

    if (defaultTheme) {
      return deserializeTheme(defaultTheme.lightConfig);
    }

    // 2. Legacy fallback: SystemSetting table
    const setting = await prisma.systemSetting.findUnique({
      where: { key: THEME_CONFIG_KEY },
    });

    if (setting) {
      return deserializeTheme(setting.value);
    }

    // 3. Ultimate fallback
    return getDefaultLightConfig();
  } catch {
    return getDefaultLightConfig();
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
    ["colors.info", config.colors.info],
    ["colors.neutral", config.colors.neutral],
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
