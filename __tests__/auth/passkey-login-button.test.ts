/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { PasskeyLoginButton } from "@/components/auth/passkey-login-button";

// Mock @simplewebauthn/browser
vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(),
  startAuthentication: vi.fn(),
}));

import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";

const mockBrowserSupportsWebAuthn = vi.mocked(browserSupportsWebAuthn);
const mockStartAuthentication = vi.mocked(startAuthentication);

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PasskeyLoginButton", () => {
  describe("Conditional rendering based on WebAuthn support", () => {
    it("renders nothing when WebAuthn is not supported", () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(false);

      const { container } = render(React.createElement(PasskeyLoginButton));
      expect(container.innerHTML).toBe("");
    });

    it("renders the button when WebAuthn is supported", () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);

      render(React.createElement(PasskeyLoginButton));
      expect(screen.getByRole("button", { name: "Mit Passkey anmelden" })).toBeDefined();
    });
  });

  describe("Successful authentication flow", () => {
    it("requests options, triggers WebAuthn, verifies, and redirects on success", async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);

      const mockOptions = { challenge: "test-challenge", rpId: "localhost" };
      const mockAssertion = {
        id: "cred-id",
        rawId: "raw-id",
        response: { authenticatorData: "auth", clientDataJSON: "cdj", signature: "sig" },
        type: "public-key",
        clientExtensionResults: {},
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockOptions }) // options
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // verify

      mockStartAuthentication.mockResolvedValueOnce(mockAssertion as never);

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/passkey/authenticate/options", {
          method: "POST",
        });
        expect(mockStartAuthentication).toHaveBeenCalledWith(mockOptions);
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/passkey/authenticate/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assertion: mockAssertion }),
        });
        expect(mockPush).toHaveBeenCalledWith("/");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);
    });

    it("shows expired challenge error", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "c" }) })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Die Sicherheitsabfrage ist abgelaufen." }),
        });

      mockStartAuthentication.mockResolvedValueOnce({ id: "x" } as never);

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut.")
        ).toBeDefined();
      });
    });

    it("shows invalid assertion error and allows retry", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "c" }) })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Assertion invalid" }),
        });

      mockStartAuthentication.mockResolvedValueOnce({ id: "x" } as never);

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.")
        ).toBeDefined();
      });

      // Button should still be clickable for retry
      expect(screen.getByRole("button", { name: "Mit Passkey anmelden" })).not.toBeNull();
    });

    it("shows rate limited error with minutes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ retryAfterMinutes: 12 }),
      });

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Zu viele fehlgeschlagene Versuche. Bitte warten Sie 12 Minuten.")
        ).toBeDefined();
      });
    });

    it("shows rate limited error on verify endpoint", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "c" }) })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ retryAfterMinutes: 5 }),
        });

      mockStartAuthentication.mockResolvedValueOnce({ id: "x" } as never);

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Zu viele fehlgeschlagene Versuche. Bitte warten Sie 5 Minuten.")
        ).toBeDefined();
      });
    });

    it("shows cancellation message when user cancels WebAuthn prompt", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "c" }) });

      const cancelError = new Error("The operation was cancelled");
      cancelError.name = "NotAllowedError";
      mockStartAuthentication.mockRejectedValueOnce(cancelError);

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(screen.getByText("Anmeldung abgebrochen.")).toBeDefined();
      });
    });

    it("shows compromised credential error", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "c" }) })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert.",
          }),
        });

      mockStartAuthentication.mockResolvedValueOnce({ id: "x" } as never);

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
          )
        ).toBeDefined();
      });
    });

    it("shows loading state while authenticating", async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);
      mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      expect(screen.getByText("Authentifizierung läuft…")).toBeDefined();
    });

    it("shows generic error when options request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal error" }),
      });

      render(React.createElement(PasskeyLoginButton));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit Passkey anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.")
        ).toBeDefined();
      });
    });
  });
});
