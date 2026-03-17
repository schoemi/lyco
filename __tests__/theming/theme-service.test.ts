import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDefaultTheme } from "@/lib/theme/serializer";
import type { ThemeConfig } from "@/lib/theme/types";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getThemeConfig, saveThemeConfig } from "@/lib/services/theme-service";

const mockPrisma = vi.mocked(prisma);

describe("theme-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getThemeConfig
  // -----------------------------------------------------------------------

  describe("getThemeConfig", () => {
    it("returns default theme when no setting exists", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValueOnce(null);

      const result = await getThemeConfig();
      expect(result).toEqual(getDefaultTheme());
    });

    it("returns default theme when DB throws", async () => {
      mockPrisma.systemSetting.findUnique.mockRejectedValueOnce(
        new Error("DB connection lost")
      );

      const result = await getThemeConfig();
      expect(result).toEqual(getDefaultTheme());
    });

    it("returns default theme when stored JSON is invalid", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
        id: "id",
        key: "theme-config",
        value: "not-valid-json{{{",
        updatedAt: new Date(),
      });

      const result = await getThemeConfig();
      expect(result).toEqual(getDefaultTheme());
    });

    it("deserializes and returns a valid stored theme", async () => {
      const theme = getDefaultTheme();
      theme.appName = "My Custom App";

      mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
        id: "id",
        key: "theme-config",
        value: JSON.stringify(theme),
        updatedAt: new Date(),
      });

      const result = await getThemeConfig();
      expect(result.appName).toBe("My Custom App");
    });
  });

  // -----------------------------------------------------------------------
  // saveThemeConfig
  // -----------------------------------------------------------------------

  describe("saveThemeConfig", () => {
    it("upserts a valid theme config", async () => {
      const theme = getDefaultTheme();

      mockPrisma.systemSetting.upsert.mockResolvedValueOnce({
        id: "id",
        key: "theme-config",
        value: JSON.stringify(theme),
        updatedAt: new Date(),
      });

      await saveThemeConfig(theme);

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
        where: { key: "theme-config" },
        update: { value: JSON.stringify(theme) },
        create: { key: "theme-config", value: JSON.stringify(theme) },
      });
    });

    it("throws on invalid hex colour", async () => {
      const theme = getDefaultTheme();
      theme.colors.primary = "not-a-hex";

      await expect(saveThemeConfig(theme)).rejects.toThrow(
        /Invalid hex colour for colors\.primary/
      );
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("throws on appName exceeding 50 characters", async () => {
      const theme = getDefaultTheme();
      theme.appName = "A".repeat(51);

      await expect(saveThemeConfig(theme)).rejects.toThrow(/Invalid appName/);
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("throws on invalid font weight", async () => {
      const theme = getDefaultTheme();
      theme.typography.headlineWeight = "999";

      await expect(saveThemeConfig(theme)).rejects.toThrow(
        /Invalid font weight/
      );
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("throws on empty font family", async () => {
      const theme = getDefaultTheme();
      theme.typography.headlineFont = "   ";

      await expect(saveThemeConfig(theme)).rejects.toThrow(
        /Invalid font family/
      );
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("throws on karaoke activeLineSize out of range", async () => {
      const theme = getDefaultTheme();
      theme.karaoke.activeLineSize = "60px";

      await expect(saveThemeConfig(theme)).rejects.toThrow(
        /Invalid karaoke activeLineSize/
      );
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it("allows null accent colour", async () => {
      const theme = getDefaultTheme();
      theme.colors.accent = null;

      mockPrisma.systemSetting.upsert.mockResolvedValueOnce({
        id: "id",
        key: "theme-config",
        value: JSON.stringify(theme),
        updatedAt: new Date(),
      });

      await expect(saveThemeConfig(theme)).resolves.toBeUndefined();
    });

    it("throws on invalid non-null accent colour", async () => {
      const theme = getDefaultTheme();
      theme.colors.accent = "bad";

      await expect(saveThemeConfig(theme)).rejects.toThrow(
        /Invalid hex colour for colors\.accent/
      );
    });
  });
});
