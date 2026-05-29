/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { SsoLoginButton } from "@/components/auth/sso-login-button";

// Mock next-auth/react
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SsoLoginButton", () => {
  describe("Conditional rendering based on SSO configuration", () => {
    it("renders nothing when SSO is not configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ configured: false }),
      });

      const { container } = render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/sso/status");
      });

      expect(container.innerHTML).toBe("");
    });

    it("renders nothing when SSO status check fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { container } = render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/sso/status");
      });

      expect(container.innerHTML).toBe("");
    });

    it("renders nothing when SSO status check throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { container } = render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/sso/status");
      });

      expect(container.innerHTML).toBe("");
    });

    it("renders the button when SSO is configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ configured: true }),
      });

      render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Mit SSO anmelden" })).toBeDefined();
      });
    });
  });

  describe("SSO sign-in flow", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ configured: true }),
      });
    });

    it("calls signIn with 'authentik' provider on click", async () => {
      mockSignIn.mockResolvedValueOnce(undefined);

      render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Mit SSO anmelden" })).toBeDefined();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit SSO anmelden" }));
      });

      expect(mockSignIn).toHaveBeenCalledWith("authentik", { callbackUrl: "/" });
    });

    it("shows loading state while redirecting", async () => {
      mockSignIn.mockReturnValueOnce(new Promise(() => {})); // never resolves

      render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Mit SSO anmelden" })).toBeDefined();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit SSO anmelden" }));
      });

      expect(screen.getByText("Weiterleitung…")).toBeDefined();
    });

    it("shows error message when signIn throws", async () => {
      mockSignIn.mockRejectedValueOnce(new Error("Sign-in failed"));

      render(React.createElement(SsoLoginButton));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Mit SSO anmelden" })).toBeDefined();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Mit SSO anmelden" }));
      });

      await waitFor(() => {
        expect(
          screen.getByText("SSO-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.")
        ).toBeDefined();
      });
    });
  });
});
