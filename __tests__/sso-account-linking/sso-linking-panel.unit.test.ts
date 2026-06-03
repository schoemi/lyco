/**
 * @vitest-environment jsdom
 *
 * Unit-Tests für SsoLinkingPanel — URL-Feedback-Verarbeitung
 *
 * Validates: Requirements 4.7
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mocks — müssen vor den Importen stehen
// ---------------------------------------------------------------------------

// Mock next/navigation
const mockReplace = vi.fn();
let mockSearchParamsGet: (key: string) => string | null = () => null;
let mockPathname = "/profile";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
  }),
  usePathname: () => mockPathname,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupSearchParams(params: Record<string, string>) {
  mockSearchParamsGet = (key: string) => params[key] ?? null;
}

function setupFetchSuccess(linked = false, ssoConfigured = true) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ linked, ssoConfigured }),
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockSearchParamsGet = () => null;
  mockPathname = "/profile";
});

// ---------------------------------------------------------------------------
// Import component after mocks
// ---------------------------------------------------------------------------

import { SsoLinkingPanel } from "@/components/auth/sso-linking-panel";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SsoLinkingPanel — URL-Feedback (Requirement 4.7)", () => {
  // -------------------------------------------------------------------------
  // ?success=sso-linked
  // -------------------------------------------------------------------------
  describe("?success=sso-linked", () => {
    beforeEach(() => {
      setupSearchParams({ success: "sso-linked" });
      setupFetchSuccess();
    });

    it("zeigt den Erfolgs-Text 'SSO-Verknüpfung erfolgreich eingerichtet'", async () => {
      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(
          screen.getByText("SSO-Verknüpfung erfolgreich eingerichtet")
        ).toBeDefined();
      });
    });

    it("zeigt die Meldung als nicht-Fehler-Alert an", async () => {
      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toBe("SSO-Verknüpfung erfolgreich eingerichtet");
      });
    });
  });

  // -------------------------------------------------------------------------
  // ?error=sso-link-failed
  // -------------------------------------------------------------------------
  describe("?error=sso-link-failed", () => {
    beforeEach(() => {
      setupSearchParams({ error: "sso-link-failed" });
      setupFetchSuccess();
    });

    it("zeigt den Fehlertext 'SSO-Verknüpfung fehlgeschlagen'", async () => {
      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const feedbackAlert = alerts.find((el) =>
          el.textContent?.includes("SSO-Verknüpfung fehlgeschlagen")
        );
        expect(feedbackAlert).toBeDefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // ?error=sso-link-denied
  // -------------------------------------------------------------------------
  describe("?error=sso-link-denied", () => {
    beforeEach(() => {
      setupSearchParams({ error: "sso-link-denied" });
      setupFetchSuccess();
    });

    it("zeigt den Fehlertext 'SSO-Anmeldung wurde abgebrochen'", async () => {
      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const feedbackAlert = alerts.find((el) =>
          el.textContent?.includes("SSO-Anmeldung wurde abgebrochen")
        );
        expect(feedbackAlert).toBeDefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // ?error=sso-link-invalid-state
  // -------------------------------------------------------------------------
  describe("?error=sso-link-invalid-state", () => {
    beforeEach(() => {
      setupSearchParams({ error: "sso-link-invalid-state" });
      setupFetchSuccess();
    });

    it("zeigt den Fehlertext 'Ungültiger Verknüpfungsstatus'", async () => {
      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const feedbackAlert = alerts.find((el) =>
          el.textContent?.includes("Ungültiger Verknüpfungsstatus")
        );
        expect(feedbackAlert).toBeDefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // ?error=sso-already-linked
  // -------------------------------------------------------------------------
  describe("?error=sso-already-linked", () => {
    beforeEach(() => {
      setupSearchParams({ error: "sso-already-linked" });
      setupFetchSuccess();
    });

    it("zeigt den Fehlertext 'Dieser SSO-Account ist bereits mit einem anderen Konto verknüpft'", async () => {
      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        const alerts = screen.getAllByRole("alert");
        const feedbackAlert = alerts.find((el) =>
          el.textContent?.includes(
            "Dieser SSO-Account ist bereits mit einem anderen Konto verknüpft"
          )
        );
        expect(feedbackAlert).toBeDefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // URL-Parameter werden bereinigt
  // -------------------------------------------------------------------------
  describe("URL-Parameter werden nach dem Anzeigen bereinigt", () => {
    it("ruft router.replace mit dem Pfad ohne Parameter auf wenn ?success vorhanden ist", async () => {
      mockPathname = "/profile";
      setupSearchParams({ success: "sso-linked" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/profile", { scroll: false });
      });
    });

    it("ruft router.replace mit dem Pfad ohne Parameter auf wenn ?error vorhanden ist", async () => {
      mockPathname = "/profile";
      setupSearchParams({ error: "sso-link-failed" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/profile", { scroll: false });
      });
    });

    it("ruft router.replace NICHT auf wenn keine URL-Parameter vorhanden sind", async () => {
      setupSearchParams({});
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        // Wait for fetch to complete
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("bereinigt die URL auch bei ?error=sso-link-denied", async () => {
      mockPathname = "/profile";
      setupSearchParams({ error: "sso-link-denied" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/profile", { scroll: false });
      });
    });

    it("bereinigt die URL auch bei ?error=sso-already-linked", async () => {
      mockPathname = "/profile";
      setupSearchParams({ error: "sso-already-linked" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/profile", { scroll: false });
      });
    });

    it("bereinigt die URL auch bei ?error=sso-link-invalid-state", async () => {
      mockPathname = "/profile";
      setupSearchParams({ error: "sso-link-invalid-state" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/profile", { scroll: false });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Kein Feedback bei unbekannten Parametern
  // -------------------------------------------------------------------------
  describe("Kein Feedback bei ungültigen Parametern", () => {
    it("zeigt keine Feedback-Meldung bei unbekanntem ?error-Wert", async () => {
      setupSearchParams({ error: "some-unknown-error" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // There should be no feedback alert (only panel-state alerts if any)
      // The component shows no feedback for unknown error keys
      const textContent = document.body.textContent ?? "";
      expect(textContent).not.toContain("SSO-Verknüpfung fehlgeschlagen");
      expect(textContent).not.toContain("SSO-Anmeldung wurde abgebrochen");
      expect(textContent).not.toContain("Ungültiger Verknüpfungsstatus");
    });

    it("ruft router.replace NICHT auf bei unbekanntem ?error-Wert", async () => {
      setupSearchParams({ error: "some-unknown-error" });
      setupFetchSuccess();

      render(React.createElement(SsoLinkingPanel));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
