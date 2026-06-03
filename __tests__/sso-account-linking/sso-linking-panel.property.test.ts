/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup, waitFor, within } from "@testing-library/react";
import fc from "fast-check";

/**
 * Property 10: SsoLinkingPanel zeigt für jeden API-Zustand die korrekte UI
 *
 * For any response from GET /api/auth/sso/link-status (linked, unlinked,
 * ssoConfigured=false, network error), the SsoLinkingPanel SHALL render a UI
 * state that:
 *   (a) linked: shows the provider name and a visible unlink button
 *   (b) unlinked + ssoConfigured: shows a visible link button
 *   (c) sso-not-configured: shows no link button but an admin-hint message
 *   (d) error: shows an error message with a retry affordance
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.8, 4.9**
 */

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
const mockSearchParamsGet = vi.fn().mockReturnValue(null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
  usePathname: () => "/profile",
}));

// ---------------------------------------------------------------------------
// Mock window.confirm and window.location
// ---------------------------------------------------------------------------

Object.defineProperty(window, "confirm", {
  value: vi.fn().mockReturnValue(false),
  writable: true,
});
Object.defineProperty(window, "location", {
  value: { href: "" },
  writable: true,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockSearchParamsGet.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// Helper: mock fetch with a given response
// ---------------------------------------------------------------------------

function mockFetchWithJson(data: object, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchWithNetworkError() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Network error")),
  );
}

// ---------------------------------------------------------------------------
// Helper: render and wait for loading to finish, then return scoped queries
// ---------------------------------------------------------------------------

async function renderAndWait() {
  // Dynamic import picks up mocked modules
  const { SsoLinkingPanel } = await import(
    "@/components/auth/sso-linking-panel"
  );
  const { container } = render(React.createElement(SsoLinkingPanel));

  // Wait until the loading state disappears
  await waitFor(() => {
    const loadingText = container.querySelector("p");
    if (loadingText && loadingText.textContent?.includes("SSO-Status wird geladen")) {
      throw new Error("Still loading");
    }
  });

  return within(container);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty provider name strings (printable ASCII, no whitespace-only) */
const PROVIDER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
const providerNameArb = fc
  .array(fc.constantFrom(...PROVIDER_CHARS), { minLength: 1, maxLength: 30 })
  .map((chars) => chars.join(""));

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 10: SsoLinkingPanel zeigt für jeden API-Zustand die korrekte UI", () => {
  /**
   * (a) linked: shows the provider name and a visible unlink button
   */
  it("(a) linked state: renders provider name and unlink button for any provider name", async () => {
    await fc.assert(
      fc.asyncProperty(providerNameArb, async (provider) => {
        mockFetchWithJson({ linked: true, provider, ssoConfigured: true });

        const queries = await renderAndWait();

        // Provider name must be visible in the highlighted span
        const providerSpan = queries.getByText(provider, { selector: "span" });
        expect(providerSpan).toBeDefined();

        // Unlink button must be present and visible
        const unlinkBtn = queries.getByRole("button", { name: /Verknüpfung aufheben/i });
        expect(unlinkBtn).toBeDefined();

        // No link button should appear
        expect(queries.queryByRole("button", { name: /Mit SSO verknüpfen/i })).toBeNull();

        cleanup();
      }),
      PBT_CONFIG,
    );
  });

  /**
   * (b) unlinked + ssoConfigured: shows a visible link button
   */
  it("(b) unlinked + ssoConfigured state: renders link button", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        mockFetchWithJson({ linked: false, ssoConfigured: true });

        const queries = await renderAndWait();

        // Link button must be present and visible
        const linkBtn = queries.getByRole("button", { name: /Mit SSO verknüpfen/i });
        expect(linkBtn).toBeDefined();

        // No unlink button should be present
        expect(queries.queryByRole("button", { name: /Verknüpfung aufheben/i })).toBeNull();

        cleanup();
      }),
      PBT_CONFIG,
    );
  });

  /**
   * (c) sso-not-configured: shows no link button, but an admin-hint message
   */
  it("(c) sso-not-configured state: shows admin-hint and no link button", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        mockFetchWithJson({ linked: false, ssoConfigured: false });

        const queries = await renderAndWait();

        // No link button
        expect(queries.queryByRole("button", { name: /Mit SSO verknüpfen/i })).toBeNull();

        // Admin-hint text must be visible
        const hint = queries.getByText(/Administrator/i);
        expect(hint).toBeDefined();

        cleanup();
      }),
      PBT_CONFIG,
    );
  });

  /**
   * (d) error: shows an error message with a retry affordance on network failure
   */
  it("(d) error state: shows error message and retry button on network failure", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        mockFetchWithNetworkError();

        const queries = await renderAndWait();

        // Error message must be present (role=alert)
        const alerts = queries.getAllByRole("alert");
        expect(alerts.length).toBeGreaterThan(0);

        // Retry button must be present
        const retryBtn = queries.getByRole("button", { name: /Erneut versuchen/i });
        expect(retryBtn).toBeDefined();

        cleanup();
      }),
      PBT_CONFIG,
    );
  });

  /**
   * (d) error: shows error message and retry when API returns non-OK response
   */
  it("(d) error state: shows error message and retry button on server error response", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          mockFetchWithJson({ error: "server error" }, statusCode);

          const queries = await renderAndWait();

          // Error message with role=alert
          const alerts = queries.getAllByRole("alert");
          expect(alerts.length).toBeGreaterThan(0);

          // Retry button
          const retryBtn = queries.getByRole("button", { name: /Erneut versuchen/i });
          expect(retryBtn).toBeDefined();

          cleanup();
        },
      ),
      PBT_CONFIG,
    );
  });
});
