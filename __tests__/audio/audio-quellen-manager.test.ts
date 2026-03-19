/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Audio-Quellen-Manager
 *
 * Testen: Formular-Rendering, Hinzufügen, Bearbeiten, Löschen,
 * Validierungsfehler, Ladezustände
 *
 * Anforderungen: 1.1, 1.2, 1.3, 5.1, 5.2
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import AudioQuellenManager from "@/components/songs/audio-quellen-manager";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SONG_ID = "song-123";

function makeQuelle(overrides?: Partial<AudioQuelleResponse>): AudioQuelleResponse {
  return {
    id: "quelle-1",
    url: "https://example.com/song.mp3",
    typ: "MP3",
    label: "Original",
    orderIndex: 0,
    rolle: "STANDARD",
    ...overrides,
  };
}

function renderManager(
  audioQuellen: AudioQuelleResponse[] = [],
  onQuellenChanged = vi.fn(),
) {
  return render(
    React.createElement(AudioQuellenManager, {
      songId: SONG_ID,
      audioQuellen,
      onQuellenChanged,
    }),
  );
}

describe("AudioQuellenManager Unit-Tests", () => {
  // 1. Renders add form with URL, type, and label inputs
  it("renders add form with URL, type, and label inputs", () => {
    renderManager();

    expect(screen.getByLabelText("URL")).toBeDefined();
    expect(screen.getByLabelText("Typ")).toBeDefined();
    expect(screen.getByLabelText("Label")).toBeDefined();
    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeDefined();
  });

  // 2. Shows empty state message when no audio sources
  it('shows "Noch keine Audio-Quellen vorhanden" when empty', () => {
    renderManager([]);

    expect(
      screen.getByText(/Noch keine Audio-Quellen vorhanden/),
    ).toBeDefined();
  });

  // 3. Renders existing audio sources in a list
  it("renders existing audio sources in a list", () => {
    const quellen = [
      makeQuelle({ id: "q1", label: "Original", orderIndex: 0 }),
      makeQuelle({ id: "q2", label: "Instrumental", typ: "SPOTIFY", orderIndex: 1 }),
    ];
    renderManager(quellen);

    expect(screen.getByText("Original")).toBeDefined();
    expect(screen.getByText("Instrumental")).toBeDefined();
    expect(screen.queryByText(/Noch keine Audio-Quellen vorhanden/)).toBeNull();
  });

  // 4. Shows edit/delete buttons for each source
  it("shows edit/delete buttons for each source", () => {
    const quellen = [
      makeQuelle({ id: "q1", label: "Original" }),
      makeQuelle({ id: "q2", label: "Instrumental", orderIndex: 1 }),
    ];
    renderManager(quellen);

    const editButtons = screen.getAllByText("Bearbeiten");
    const deleteButtons = screen.getAllByText("Löschen");
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  // 5. Clicking "Bearbeiten" enters inline edit mode
  it('clicking "Bearbeiten" enters inline edit mode', () => {
    const quelle = makeQuelle({ label: "Original" });
    renderManager([quelle]);

    fireEvent.click(screen.getByText("Bearbeiten"));

    // Edit mode should show save/cancel buttons and input fields
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDefined();
    // The edit URL input should have the current value
    const urlInput = screen.getByLabelText("URL", { selector: `#edit-url-${quelle.id}` }) as HTMLInputElement;
    expect(urlInput.value).toBe(quelle.url);
  });

  // 6. Clicking "Abbrechen" in edit mode cancels editing
  it('clicking "Abbrechen" in edit mode cancels editing', () => {
    const quelle = makeQuelle({ label: "Original" });
    renderManager([quelle]);

    fireEvent.click(screen.getByText("Bearbeiten"));
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    // Should be back in display mode
    expect(screen.queryByRole("button", { name: "Speichern" })).toBeNull();
    expect(screen.getByText("Bearbeiten")).toBeDefined();
  });

  // 7. Shows delete confirmation when "Löschen" is clicked
  it('shows delete confirmation when "Löschen" is clicked', () => {
    const quelle = makeQuelle({ label: "Original" });
    renderManager([quelle]);

    fireEvent.click(screen.getByText("Löschen"));

    expect(
      screen.getByText(/Audio-Quelle .* wirklich löschen\?/),
    ).toBeDefined();
  });

  // 8. Clicking "Abbrechen" in delete confirmation cancels
  it('clicking "Abbrechen" in delete confirmation cancels', () => {
    const quelle = makeQuelle({ label: "Original" });
    renderManager([quelle]);

    // Open delete confirmation
    fireEvent.click(screen.getByText("Löschen"));
    expect(screen.getByText(/wirklich löschen/)).toBeDefined();

    // The confirmation has its own "Abbrechen" button – find it within the confirmation area
    const cancelButtons = screen.getAllByRole("button", { name: "Abbrechen" });
    fireEvent.click(cancelButtons[0]);

    expect(screen.queryByText(/wirklich löschen/)).toBeNull();
  });

  // 9. Shows validation error when URL is empty on add
  it("shows validation error when URL is empty on add", async () => {
    renderManager();

    // Fill label but leave URL empty
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Test Label" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(screen.getByText("URL ist erforderlich")).toBeDefined();
  });

  // 10. Shows validation error when label is empty on add
  it("shows validation error when label is empty on add", async () => {
    renderManager();

    // Fill URL but leave label empty
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/song.mp3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    expect(screen.getByText("Label ist erforderlich")).toBeDefined();
  });

  // 11. Calls onQuellenChanged after successful add (mock fetch)
  it("calls onQuellenChanged after successful add", async () => {
    const onQuellenChanged = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "new-1", url: "https://example.com/song.mp3", typ: "MP3", label: "New", orderIndex: 0 }),
      }),
    );

    renderManager([], onQuellenChanged);

    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://example.com/song.mp3" },
    });
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "New" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() => {
      expect(onQuellenChanged).toHaveBeenCalledTimes(1);
    });
  });

  // 12. Calls onQuellenChanged after successful delete (mock fetch)
  it("calls onQuellenChanged after successful delete", async () => {
    const onQuellenChanged = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }),
    );

    const quelle = makeQuelle({ label: "Original" });
    renderManager([quelle], onQuellenChanged);

    // Open delete confirmation
    fireEvent.click(screen.getByText("Löschen"));

    // Click the red "Löschen" button inside the confirmation
    const deleteButtons = screen.getAllByRole("button", { name: /Löschen/ });
    // The last one is the confirm delete button inside the confirmation dialog
    const confirmDeleteBtn = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(onQuellenChanged).toHaveBeenCalledTimes(1);
    });
  });
});
