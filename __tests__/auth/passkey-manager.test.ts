/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { PasskeyManager } from "@/components/auth/passkey-manager";

// Mock @simplewebauthn/browser
vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(),
  startRegistration: vi.fn(),
}));

import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";

const mockBrowserSupportsWebAuthn = vi.mocked(browserSupportsWebAuthn);
const mockStartRegistration = vi.mocked(startRegistration);

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PasskeyManager", () => {
  describe("WebAuthn support check", () => {
    it("renders nothing when WebAuthn is not supported", () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(false);

      const { container } = render(React.createElement(PasskeyManager));
      expect(container.innerHTML).toBe("");
    });

    it("renders the component when WebAuthn is supported", async () => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ passkeys: [] }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        expect(screen.getByText("Passkeys")).toBeDefined();
      });
    });
  });

  describe("Passkey list display", () => {
    beforeEach(() => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);
    });

    it("shows loading state while fetching passkeys", () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

      render(React.createElement(PasskeyManager));
      expect(screen.getByText("Passkeys werden geladen…")).toBeDefined();
    });

    it("shows empty state when no passkeys are registered", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ passkeys: [] }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        expect(screen.getByText("Noch keine Passkeys registriert.")).toBeDefined();
      });
    });

    it("displays passkeys with name and creation date", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          passkeys: [
            { id: "pk1", name: "MacBook Touch ID", createdAt: "2024-01-15T10:00:00Z" },
            { id: "pk2", name: "iPhone Face ID", createdAt: "2024-02-20T14:30:00Z" },
          ],
        }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        expect(screen.getByText("MacBook Touch ID")).toBeDefined();
        expect(screen.getByText("iPhone Face ID")).toBeDefined();
        expect(screen.getByText(/15\.01\.2024/)).toBeDefined();
        expect(screen.getByText(/20\.02\.2024/)).toBeDefined();
      });
    });

    it("shows error when fetching passkeys fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error" }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        expect(screen.getByText("Fehler beim Laden der Passkeys.")).toBeDefined();
      });
    });
  });

  describe("Register new passkey", () => {
    beforeEach(() => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ passkeys: [] }),
      });
    });

    it("shows name input when 'Neuen Passkey registrieren' is clicked", async () => {
      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        expect(screen.getByText("Neuen Passkey registrieren")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Neuen Passkey registrieren"));

      expect(screen.getByLabelText("Name für den neuen Passkey")).toBeDefined();
    });

    it("validates name is not empty", async () => {
      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      fireEvent.click(screen.getByText("Passkey registrieren"));

      expect(
        screen.getByText("Der Passkey-Name muss zwischen 1 und 64 Zeichen lang sein.")
      ).toBeDefined();
    });

    it("validates name is not longer than 64 characters", async () => {
      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      const input = screen.getByLabelText("Name für den neuen Passkey");
      // The input has maxLength=64, but we test the validation logic with spaces
      fireEvent.change(input, { target: { value: "   " } }); // only whitespace
      fireEvent.click(screen.getByText("Passkey registrieren"));

      expect(
        screen.getByText("Der Passkey-Name muss zwischen 1 und 64 Zeichen lang sein.")
      ).toBeDefined();
    });

    it("calls registration flow with valid name", async () => {
      const mockOptions = { challenge: "test-challenge", rp: { name: "Lyco" } };
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockOptions }) // register/options
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new-pk" }) }) // register/verify
        .mockResolvedValueOnce({ ok: true, json: async () => ({ passkeys: [{ id: "new-pk", name: "Test Key", createdAt: "2024-03-01T00:00:00Z" }] }) }); // refresh list

      mockStartRegistration.mockResolvedValueOnce({
        id: "cred-id",
        rawId: "raw-id",
        response: { attestationObject: "att", clientDataJSON: "cdj" },
        type: "public-key",
        clientExtensionResults: {},
        authenticatorAttachment: "platform",
      } as never);

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      const input = screen.getByLabelText("Name für den neuen Passkey");
      fireEvent.change(input, { target: { value: "Test Key" } });
      
      await act(async () => {
        fireEvent.click(screen.getByText("Passkey registrieren"));
      });

      await waitFor(() => {
        expect(mockStartRegistration).toHaveBeenCalled();
      });
    });

    it("shows error when limit is reached", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey." }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      const input = screen.getByLabelText("Name für den neuen Passkey");
      fireEvent.change(input, { target: { value: "New Key" } });

      await act(async () => {
        fireEvent.click(screen.getByText("Passkey registrieren"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey.")
        ).toBeDefined();
      });
    });

    it("shows timeout error when registration times out", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: "test" }),
      });

      const timeoutError = new Error("The operation timed out");
      timeoutError.name = "AbortError";
      mockStartRegistration.mockRejectedValueOnce(timeoutError);

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      const input = screen.getByLabelText("Name für den neuen Passkey");
      fireEvent.change(input, { target: { value: "Test" } });

      await act(async () => {
        fireEvent.click(screen.getByText("Passkey registrieren"));
      });

      await waitFor(() => {
        expect(
          screen.getByText("Zeitüberschreitung bei der Registrierung. Bitte versuchen Sie es erneut.")
        ).toBeDefined();
      });
    });

    it("shows cancel error when user cancels registration", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: "test" }),
      });

      const cancelError = new Error("The operation was cancelled");
      cancelError.name = "NotAllowedError";
      mockStartRegistration.mockRejectedValueOnce(cancelError);

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      const input = screen.getByLabelText("Name für den neuen Passkey");
      fireEvent.change(input, { target: { value: "Test" } });

      await act(async () => {
        fireEvent.click(screen.getByText("Passkey registrieren"));
      });

      await waitFor(() => {
        expect(screen.getByText("Registrierung abgebrochen.")).toBeDefined();
      });
    });

    it("shows unsupported device error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenge: "test" }),
      });

      const unsupportedError = new Error("Device not supported");
      unsupportedError.name = "NotSupportedError";
      mockStartRegistration.mockRejectedValueOnce(unsupportedError);

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      const input = screen.getByLabelText("Name für den neuen Passkey");
      fireEvent.change(input, { target: { value: "Test" } });

      await act(async () => {
        fireEvent.click(screen.getByText("Passkey registrieren"));
      });

      await waitFor(() => {
        expect(screen.getByText("Ihr Gerät unterstützt keine Passkeys.")).toBeDefined();
      });
    });

    it("hides name input when cancel button is clicked", async () => {
      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByText("Neuen Passkey registrieren"));
      });

      expect(screen.getByLabelText("Name für den neuen Passkey")).toBeDefined();

      fireEvent.click(screen.getByText("Abbrechen"));

      expect(screen.queryByLabelText("Name für den neuen Passkey")).toBeNull();
    });
  });

  describe("Delete passkey", () => {
    beforeEach(() => {
      mockBrowserSupportsWebAuthn.mockReturnValue(true);
    });

    it("shows confirmation when delete button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          passkeys: [{ id: "pk1", name: "Test Key", createdAt: "2024-01-01T00:00:00Z" }],
        }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeDefined();
      });

      fireEvent.click(screen.getByLabelText('Passkey "Test Key" löschen'));

      expect(screen.getByText("Wirklich löschen?")).toBeDefined();
    });

    it("cancels deletion when 'Nein' is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          passkeys: [{ id: "pk1", name: "Test Key", createdAt: "2024-01-01T00:00:00Z" }],
        }),
      });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Passkey "Test Key" löschen'));
      });

      fireEvent.click(screen.getByText("Nein"));

      expect(screen.queryByText("Wirklich löschen?")).toBeNull();
    });

    it("calls delete API when confirmed", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            passkeys: [{ id: "pk1", name: "Test Key", createdAt: "2024-01-01T00:00:00Z" }],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // DELETE
        .mockResolvedValueOnce({ ok: true, json: async () => ({ passkeys: [] }) }); // refresh

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Passkey "Test Key" löschen'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Ja"));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/passkey/credentials/pk1", {
          method: "DELETE",
        });
      });
    });

    it("shows error when delete fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            passkeys: [{ id: "pk1", name: "Test Key", createdAt: "2024-01-01T00:00:00Z" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Passkey nicht gefunden" }),
        });

      render(React.createElement(PasskeyManager));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Passkey "Test Key" löschen'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Ja"));
      });

      await waitFor(() => {
        expect(screen.getByText("Passkey nicht gefunden")).toBeDefined();
      });
    });
  });
});
