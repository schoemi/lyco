/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für FreigabeDialog
 *
 * Testen: Rendering, E-Mail-Validierung, Song-/Set-Freigabe,
 * Erfolgs-/Fehlermeldungen, Schließen-Verhalten
 *
 * Anforderungen: 1.1, 2.1
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import FreigabeDialog from "@/components/sharing/freigabe-dialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SONG_ID = "song-123";
const SET_ID = "set-456";

function renderDialog(overrides?: Partial<Parameters<typeof FreigabeDialog>[0]>) {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    type: "song" as const,
    itemId: SONG_ID,
  };
  return render(React.createElement(FreigabeDialog, { ...defaultProps, ...overrides }));
}

describe("FreigabeDialog Unit-Tests", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      React.createElement(FreigabeDialog, {
        open: false,
        onClose: vi.fn(),
        type: "song",
        itemId: SONG_ID,
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog with email input and buttons when open", () => {
    renderDialog();

    expect(screen.getByText("Song teilen")).toBeDefined();
    expect(screen.getByLabelText("E-Mail-Adresse des Empfängers")).toBeDefined();
    expect(screen.getByRole("button", { name: "Teilen" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeDefined();
  });

  it("shows 'Set teilen' title for set type", () => {
    renderDialog({ type: "set", itemId: SET_ID });

    expect(screen.getByText("Set teilen")).toBeDefined();
  });

  it("shows validation error for invalid email format", async () => {
    renderDialog();

    const input = screen.getByLabelText("E-Mail-Adresse des Empfängers");
    fireEvent.change(input, { target: { value: "invalid-email" } });

    const form = screen.getByRole("button", { name: "Teilen" }).closest("form")!;
    fireEvent.submit(form);

    expect(screen.getByText("Bitte geben Sie eine gültige E-Mail-Adresse ein")).toBeDefined();
  });

  it("calls POST /api/freigaben/songs for song type on valid submit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({ id: "f1", songId: SONG_ID, empfaengerId: "u2", erstelltAm: new Date().toISOString() }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderDialog();

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/freigaben/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: SONG_ID, empfaengerEmail: "test@example.com" }),
      });
    });
  });

  it("calls POST /api/freigaben/sets for set type on valid submit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({ id: "f1", setId: SET_ID, empfaengerId: "u2", erstelltAm: new Date().toISOString() }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderDialog({ type: "set", itemId: SET_ID });

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/freigaben/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: SET_ID, empfaengerEmail: "test@example.com" }),
      });
    });
  });

  it("shows success message on 201 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({}),
    }));

    renderDialog();

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(screen.getByText("Song wurde erfolgreich freigegeben")).toBeDefined();
    });
  });

  it("shows error message from API on non-201 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 404,
      json: () => Promise.resolve({ error: "Nutzer nicht gefunden" }),
    }));

    renderDialog();

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(screen.getByText("Nutzer nicht gefunden")).toBeDefined();
    });
  });

  it("shows 409 conflict error for duplicate sharing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 409,
      json: () => Promise.resolve({ error: "Song ist bereits für diesen Nutzer freigegeben" }),
    }));

    renderDialog();

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(screen.getByText("Song ist bereits für diesen Nutzer freigegeben")).toBeDefined();
    });
  });

  it("shows 400 self-sharing error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 400,
      json: () => Promise.resolve({ error: "Freigabe an sich selbst ist nicht möglich" }),
    }));

    renderDialog();

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "self@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(screen.getByText("Freigabe an sich selbst ist nicht möglich")).toBeDefined();
    });
  });

  it("shows network error on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    renderDialog();

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(screen.getByText("Netzwerkfehler")).toBeDefined();
    });
  });

  it("calls onClose when Schließen button is clicked", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = renderDialog({ onClose });

    const backdrop = container.querySelector(".fixed.inset-0");
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onFreigabeCreated callback on success", async () => {
    const onFreigabeCreated = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({}),
    }));

    renderDialog({ onFreigabeCreated });

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse des Empfängers"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(onFreigabeCreated).toHaveBeenCalledTimes(1);
    });
  });

  it("clears email input after successful submission", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({}),
    }));

    renderDialog();

    const input = screen.getByLabelText("E-Mail-Adresse des Empfängers") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });
});
