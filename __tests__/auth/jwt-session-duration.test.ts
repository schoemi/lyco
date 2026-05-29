/**
 * Unit tests for JWT callback dynamic session duration (Task 2.1)
 *
 * Tests the extended JWT callback in auth.config.ts that handles:
 * - rememberMe flag → 30 days session
 * - No rememberMe → 24 hours session
 * - Rolling session for remember-me users
 * - authMethod field propagation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { authConfig, SESSION_MAX_AGE_DEFAULT, SESSION_MAX_AGE_REMEMBER_ME } from "@/lib/auth.config";

describe("JWT callback - dynamic session duration", () => {
  const jwtCallback = authConfig.callbacks!.jwt! as (params: {
    token: Record<string, unknown>;
    user?: Record<string, unknown>;
    trigger?: string;
  }) => Promise<Record<string, unknown>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial sign-in", () => {
    it("sets 30-day expiry when rememberMe is true", async () => {
      const token: Record<string, unknown> = {};
      const user = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
        rememberMe: true,
        authMethod: "credentials",
      };

      const result = await jwtCallback({ token, user });

      const now = Math.floor(Date.now() / 1000);
      expect(result.exp).toBe(now + SESSION_MAX_AGE_REMEMBER_ME);
      expect(result.rememberMe).toBe(true);
    });

    it("sets 24-hour expiry when rememberMe is false", async () => {
      const token: Record<string, unknown> = {};
      const user = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
        rememberMe: false,
        authMethod: "credentials",
      };

      const result = await jwtCallback({ token, user });

      const now = Math.floor(Date.now() / 1000);
      expect(result.exp).toBe(now + SESSION_MAX_AGE_DEFAULT);
      expect(result.rememberMe).toBe(false);
    });

    it("sets 24-hour expiry when rememberMe is absent", async () => {
      const token: Record<string, unknown> = {};
      const user = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
      };

      const result = await jwtCallback({ token, user });

      const now = Math.floor(Date.now() / 1000);
      expect(result.exp).toBe(now + SESSION_MAX_AGE_DEFAULT);
      expect(result.rememberMe).toBe(false);
    });

    it("sets authMethod from user object", async () => {
      const token: Record<string, unknown> = {};
      const user = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
        authMethod: "passkey",
      };

      const result = await jwtCallback({ token, user });

      expect(result.authMethod).toBe("passkey");
    });

    it("defaults authMethod to credentials when not provided", async () => {
      const token: Record<string, unknown> = {};
      const user = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
      };

      const result = await jwtCallback({ token, user });

      expect(result.authMethod).toBe("credentials");
    });

    it("populates id, role, and accountStatus from user", async () => {
      const token: Record<string, unknown> = {};
      const user = {
        id: "user-42",
        role: "ADMIN",
        accountStatus: "ACTIVE",
        rememberMe: false,
        authMethod: "credentials",
      };

      const result = await jwtCallback({ token, user });

      expect(result.id).toBe("user-42");
      expect(result.role).toBe("ADMIN");
      expect(result.accountStatus).toBe("ACTIVE");
    });
  });

  describe("rolling session", () => {
    it("extends expiry to now + 30 days on subsequent requests with rememberMe", async () => {
      // Simulate a subsequent request (no user object)
      const token: Record<string, unknown> = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
        rememberMe: true,
        authMethod: "credentials",
        exp: Math.floor(Date.now() / 1000) + 1000, // some existing expiry
      };

      const result = await jwtCallback({ token });

      const now = Math.floor(Date.now() / 1000);
      expect(result.exp).toBe(now + SESSION_MAX_AGE_REMEMBER_ME);
    });

    it("does not extend expiry for non-rememberMe sessions", async () => {
      const existingExp = Math.floor(Date.now() / 1000) + 1000;
      const token: Record<string, unknown> = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
        rememberMe: false,
        authMethod: "credentials",
        exp: existingExp,
      };

      const result = await jwtCallback({ token });

      // exp should remain unchanged for non-rememberMe sessions
      expect(result.exp).toBe(existingExp);
    });

    it("does not extend expiry when rememberMe is undefined", async () => {
      const existingExp = Math.floor(Date.now() / 1000) + 1000;
      const token: Record<string, unknown> = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
        authMethod: "credentials",
        exp: existingExp,
      };

      const result = await jwtCallback({ token });

      expect(result.exp).toBe(existingExp);
    });
  });

  describe("session callback", () => {
    const sessionCallback = authConfig.callbacks!.session! as (params: {
      session: { user: Record<string, unknown> };
      token: Record<string, unknown>;
    }) => Promise<{ user: Record<string, unknown> }>;

    it("propagates authMethod to session", async () => {
      const session = { user: { id: "", role: "", accountStatus: "" } as Record<string, unknown> };
      const token = {
        id: "user-1",
        role: "ADMIN",
        accountStatus: "ACTIVE",
        authMethod: "passkey",
      };

      const result = await sessionCallback({ session, token });

      expect(result.user.authMethod).toBe("passkey");
    });

    it("defaults authMethod to credentials when token has no authMethod", async () => {
      const session = { user: { id: "", role: "", accountStatus: "" } as Record<string, unknown> };
      const token = {
        id: "user-1",
        role: "USER",
        accountStatus: "ACTIVE",
      };

      const result = await sessionCallback({ session, token });

      expect(result.user.authMethod).toBe("credentials");
    });
  });
});

describe("Session constants", () => {
  it("SESSION_MAX_AGE_DEFAULT is 24 hours in seconds", () => {
    expect(SESSION_MAX_AGE_DEFAULT).toBe(86400);
  });

  it("SESSION_MAX_AGE_REMEMBER_ME is 30 days in seconds", () => {
    expect(SESSION_MAX_AGE_REMEMBER_ME).toBe(2592000);
  });
});
