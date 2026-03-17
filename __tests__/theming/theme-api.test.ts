import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getDefaultTheme } from "@/lib/theme/serializer";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock theme-service
const mockGetThemeConfig = vi.fn();
const mockSaveThemeConfig = vi.fn();
vi.mock("@/lib/services/theme-service", () => ({
  getThemeConfig: (...args: unknown[]) => mockGetThemeConfig(...args),
  saveThemeConfig: (...args: unknown[]) => mockSaveThemeConfig(...args),
}));

import { GET, POST } from "@/app/api/settings/theme/route";

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};
const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/settings/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Theme API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // --- GET /api/settings/theme ---
  describe("GET /api/settings/theme", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns 200 with theme config for admin", async () => {
      const theme = getDefaultTheme();
      mockGetThemeConfig.mockResolvedValue(theme);

      const res = await GET();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.appName).toBe(theme.appName);
      expect(json.colors.primary).toBe(theme.colors.primary);
    });

    it("returns 500 on DB error", async () => {
      mockGetThemeConfig.mockRejectedValue(new Error("DB down"));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // --- POST /api/settings/theme ---
  describe("POST /api/settings/theme", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await POST(makePostRequest(getDefaultTheme()));
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const res = await POST(makePostRequest(getDefaultTheme()));
      expect(res.status).toBe(403);
    });

    it("returns 200 on valid save", async () => {
      const theme = getDefaultTheme();
      mockSaveThemeConfig.mockResolvedValue(undefined);

      const res = await POST(makePostRequest(theme));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.appName).toBe(theme.appName);
      expect(mockSaveThemeConfig).toHaveBeenCalledWith(theme);
    });

    it("returns 400 on invalid data (e.g. invalid hex)", async () => {
      mockSaveThemeConfig.mockRejectedValue(
        new Error("Invalid hex colour for colors.primary: not-a-hex")
      );

      const theme = { ...getDefaultTheme(), colors: { ...getDefaultTheme().colors, primary: "not-a-hex" } };
      const res = await POST(makePostRequest(theme));
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/Invalid/);
    });

    it("returns 500 on DB error", async () => {
      mockSaveThemeConfig.mockRejectedValue(new Error("DB connection lost"));

      const res = await POST(makePostRequest(getDefaultTheme()));
      expect(res.status).toBe(500);
    });
  });
});
