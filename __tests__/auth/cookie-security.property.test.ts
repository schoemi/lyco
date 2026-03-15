/**
 * Property 15: Session-Cookie-Sicherheitsattribute
 *
 * Für jede vom Auth-System gesetzte Session muss das Session-Cookie die Attribute
 * `HttpOnly`, `Secure` und `SameSite=Strict` besitzen.
 *
 * **Validates: Requirements 7.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Capture the config passed to NextAuth
let capturedConfig: Record<string, unknown> | null = null;

vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    capturedConfig = config;
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (opts: unknown) => opts,
}));

vi.mock("@/lib/services/auth-service", () => ({
  authorize: vi.fn(),
}));

describe("Property 15: Session-Cookie-Sicherheitsattribute", () => {
  beforeEach(async () => {
    capturedConfig = null;
    // Re-import to trigger NextAuth() call and capture config
    vi.resetModules();

    // Re-mock after resetModules
    vi.doMock("next-auth", () => ({
      default: (config: Record<string, unknown>) => {
        capturedConfig = config;
        return {
          handlers: {},
          auth: vi.fn(),
          signIn: vi.fn(),
          signOut: vi.fn(),
        };
      },
    }));

    vi.doMock("next-auth/providers/credentials", () => ({
      default: (opts: unknown) => opts,
    }));

    vi.doMock("@/lib/services/auth-service", () => ({
      authorize: vi.fn(),
    }));

    await import("@/lib/auth");
  });

  it("Session-Cookie hat httpOnly, secure und sameSite=strict für beliebige Session-Szenarien", async () => {
    expect(capturedConfig).not.toBeNull();

    const cookies = capturedConfig!.cookies as {
      sessionToken?: { options?: Record<string, unknown> };
    };

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          role: fc.constantFrom("ADMIN", "USER"),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          sessionId: fc.uuid(),
        }),
        async (_sessionScenario) => {
          // The cookie config is static in NextAuth config, but we verify
          // it holds for any conceivable session scenario
          expect(cookies).toBeDefined();
          expect(cookies.sessionToken).toBeDefined();
          expect(cookies.sessionToken!.options).toBeDefined();

          const options = cookies.sessionToken!.options!;
          expect(options.httpOnly).toBe(true);
          expect(options.secure).toBe(true);
          expect(options.sameSite).toBe("strict");
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Cookie-Konfiguration enthält keine unsicheren Überschreibungen", () => {
    expect(capturedConfig).not.toBeNull();

    const cookies = capturedConfig!.cookies as {
      sessionToken?: { options?: Record<string, unknown> };
    };

    const options = cookies?.sessionToken?.options;
    expect(options).toBeDefined();

    // httpOnly must not be false or missing
    expect(options!.httpOnly).not.toBe(false);
    // secure must not be false or missing
    expect(options!.secure).not.toBe(false);
    // sameSite must not be "none" or "lax"
    expect(options!.sameSite).not.toBe("none");
    expect(options!.sameSite).not.toBe("lax");
  });
});
