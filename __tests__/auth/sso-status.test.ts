/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { SsoLinkingPanel } from "@/components/auth/sso-linking-panel";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SsoStatus", () => {
  it("shows loading state initially", () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves

    render(React.createElement(SsoLinkingPanel));
    expect(screen.getByText("SSO-Status wird geladen…")).toBeDefined();
  });

  it("shows linked status with provider name when account is linked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ linked: true, provider: "Authentik" }),
    });

    render(React.createElement(SsoLinkingPanel));

    await waitFor(() => {
      expect(screen.getByText("Ihr Konto ist mit SSO verknüpft")).toBeDefined();
      expect(screen.getByText("(Provider: Authentik)")).toBeDefined();
    });
  });

  it("shows not linked status when account is not linked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ linked: false }),
    });

    render(React.createElement(SsoLinkingPanel));

    await waitFor(() => {
      expect(screen.getByText("Ihr Konto ist nicht mit SSO verknüpft")).toBeDefined();
    });
  });

  it("shows error message when API call fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Interner Serverfehler" }),
    });

    render(React.createElement(SsoLinkingPanel));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Fehler beim Laden des SSO-Status")).toBeDefined();
    });
  });

  it("shows error message when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(React.createElement(SsoLinkingPanel));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Fehler beim Laden des SSO-Status")).toBeDefined();
    });
  });

  it("calls the correct API endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ linked: false }),
    });

    render(React.createElement(SsoLinkingPanel));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/sso/link-status");
    });
  });
});
