/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

// Mock the RememberMeCheckbox component
vi.mock("@/components/auth/remember-me-checkbox", () => ({
  RememberMeCheckbox: ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) =>
    React.createElement("input", {
      type: "checkbox",
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked),
      "aria-label": "Angemeldet bleiben",
    }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Helper to render the login page with specific search params.
 */
async function renderLoginWithError(error: string) {
  // Update the mock search params
  Object.defineProperty(mockSearchParams, "get", {
    value: (key: string) => (key === "error" ? error : null),
    configurable: true,
  });

  // Dynamic import to pick up the mocked modules
  const { default: LoginPage } = await import("@/app/(auth)/login/page");
  render(React.createElement(LoginPage));
}

describe("SSO Error Handling on Login Page", () => {
  describe("SSO authentication failure (sso-failed)", () => {
    it("displays SSO authentication failed message for sso-failed error", async () => {
      await renderLoginWithError("sso-failed");

      const alert = screen.getByText(
        "SSO-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
      expect(alert).toBeDefined();
      expect(alert.closest("[role='alert']")).toBeDefined();
    });

    it("displays SSO authentication failed message for OAuthCallbackError", async () => {
      await renderLoginWithError("OAuthCallbackError");

      const alert = screen.getByText(
        "SSO-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
      expect(alert).toBeDefined();
    });

    it("displays SSO authentication failed message for OAuthSignin error", async () => {
      await renderLoginWithError("OAuthSignin");

      const alert = screen.getByText(
        "SSO-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
      expect(alert).toBeDefined();
    });
  });

  describe("SSO communication timeout (sso-timeout)", () => {
    it("displays SSO communication problem message", async () => {
      await renderLoginWithError("sso-timeout");

      const alert = screen.getByText(
        "SSO-Kommunikationsproblem. Bitte versuchen Sie es erneut."
      );
      expect(alert).toBeDefined();
      expect(alert.closest("[role='alert']")).toBeDefined();
    });
  });

  describe("No account found (no-account)", () => {
    it("displays no account found message", async () => {
      await renderLoginWithError("no-account");

      const alert = screen.getByText(
        "Kein Konto gefunden. Bitte registrieren Sie sich zuerst."
      );
      expect(alert).toBeDefined();
      expect(alert.closest("[role='alert']")).toBeDefined();
    });
  });

  describe("Existing error handling still works", () => {
    it("displays suspended message for suspended error", async () => {
      await renderLoginWithError("suspended");

      const alert = screen.getByText(
        "Ihr Konto wurde gesperrt. Bitte wenden Sie sich an den Administrator."
      );
      expect(alert).toBeDefined();
    });

    it("displays pending message for pending error", async () => {
      await renderLoginWithError("pending");

      const alert = screen.getByText(
        "Ihr Konto wartet auf Freigabe durch einen Administrator."
      );
      expect(alert).toBeDefined();
    });
  });
});
