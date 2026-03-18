/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für GeniusSearchPanel
 *
 * Testen: Tab-Anzeige, Suchergebnis-Rendering, Ladeanzeigen,
 * Fehlermeldungen, Import-Auslösung
 *
 * Anforderungen: 1.1, 2.1, 2.3, 2.4, 5.5
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { GeniusSearchPanel } from "@/components/import/genius-search-panel";
import type { GeniusSearchResult } from "@/types/genius";

describe("GeniusSearchPanel", () => {
  let onImportSuccess: (songId: string) => void;
  let onError: (message: string) => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    onImportSuccess = vi.fn<(songId: string) => void>();
    onError = vi.fn<(message: string) => void>();
  });

  afterEach(() => {
    cleanup();
  });

  // --- Requirement 1.1, 2.1: Renders search input and submit button ---

  it("renders search input and submit button", () => {
    render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    expect(screen.getByLabelText("Genius-Suche")).toBeDefined();
    expect(screen.getByLabelText("Suchen")).toBeDefined();
  });

  // --- Requirement 2.1: Shows loading indicator during search ---

  it("shows loading indicator during search", async () => {
    // fetch that never resolves during the test
    let resolveFetch!: (value: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      expect(screen.getByText("Suche läuft…")).toBeDefined();
    });

    // Resolve to avoid dangling promise
    resolveFetch({ ok: true, json: async () => ({ results: [] }) });
  });

  // --- Requirement 2.3: Renders search results with title, artist, album art ---

  it("renders search results with title, artist, and album art", async () => {
    const mockResults: GeniusSearchResult[] = [
      {
        id: 1,
        title: "Bohemian Rhapsody",
        artist: "Queen",
        url: "https://genius.com/queen-bohemian-rhapsody",
        albumArt: "https://images.genius.com/album1.jpg",
      },
      {
        id: 2,
        title: "Stairway to Heaven",
        artist: "Led Zeppelin",
        url: "https://genius.com/led-zeppelin-stairway",
        albumArt: null,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    const { container } = render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      expect(container.querySelectorAll("li").length).toBe(2);
    });

    // First result: has album art image
    const items = container.querySelectorAll("li");
    expect(items[0].textContent).toContain("Bohemian Rhapsody");
    expect(items[0].textContent).toContain("Queen");
    const img = items[0].querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("https://images.genius.com/album1.jpg");

    // Second result: no album art, placeholder shown
    expect(items[1].textContent).toContain("Stairway to Heaven");
    expect(items[1].textContent).toContain("Led Zeppelin");
    expect(items[1].querySelector("img")).toBeNull();
  });

  // --- Requirement 2.4: Shows "Keine Ergebnisse gefunden" for empty results ---

  it('shows "Keine Ergebnisse gefunden" for empty results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "nonexistent song" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      expect(screen.getByText("Keine Ergebnisse gefunden")).toBeDefined();
    });
  });

  // --- Requirement 5.5: Shows error message in role="alert" on API error ---

  it('shows error message in role="alert" on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Genius-Suche fehlgeschlagen" }),
    });

    render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain("Genius-Suche fehlgeschlagen");
    });

    expect(onError).toHaveBeenCalledWith("Genius-Suche fehlgeschlagen");
  });

  // --- Requirement 5.5: Shows network error message on fetch failure ---

  it("shows network error message on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain(
        "Verbindung zu Genius fehlgeschlagen. Bitte versuche es erneut."
      );
    });

    expect(onError).toHaveBeenCalledWith(
      "Verbindung zu Genius fehlgeschlagen. Bitte versuche es erneut."
    );
  });

  // --- Requirement 3.1: Triggers import on result click and calls onImportSuccess ---

  it("triggers import on result click and calls onImportSuccess", async () => {
    const mockResults: GeniusSearchResult[] = [
      {
        id: 42,
        title: "Imagine",
        artist: "John Lennon",
        url: "https://genius.com/john-lennon-imagine",
        albumArt: null,
      },
    ];

    // First call: search returns results. Second call: import succeeds.
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ song: { id: "song-123" } }),
      });

    const { container } = render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    // Perform search
    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "imagine" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      expect(container.querySelectorAll("li").length).toBe(1);
    });

    // Click the result to trigger import
    const resultButton = container.querySelector("li button")!;
    fireEvent.click(resultButton);

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalledWith("song-123");
    });

    // Verify the import API was called with correct payload
    const importCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(importCall[0]).toBe("/api/songs/genius/import");
    const importBody = JSON.parse(importCall[1].body);
    expect(importBody.geniusId).toBe(42);
    expect(importBody.title).toBe("Imagine");
    expect(importBody.artist).toBe("John Lennon");
  });

  // --- Requirement 3.1: Shows loading indicator during import ---

  it("shows loading indicator during import", async () => {
    const mockResults: GeniusSearchResult[] = [
      {
        id: 10,
        title: "Hey Jude",
        artist: "The Beatles",
        url: "https://genius.com/the-beatles-hey-jude",
        albumArt: null,
      },
    ];

    let resolveImport!: (value: unknown) => void;

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveImport = resolve;
        })
      );

    const { container } = render(
      React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
    );

    // Perform search
    const input = screen.getByLabelText("Genius-Suche");
    fireEvent.change(input, { target: { value: "hey jude" } });
    fireEvent.click(screen.getByLabelText("Suchen"));

    await waitFor(() => {
      expect(container.querySelectorAll("li").length).toBe(1);
    });

    // Click result to trigger import
    const resultButton = container.querySelector("li button")!;
    fireEvent.click(resultButton);

    await waitFor(() => {
      expect(screen.getByText("Song wird importiert…")).toBeDefined();
    });

    // Resolve to avoid dangling promise
    resolveImport({ ok: true, json: async () => ({ song: { id: "s1" } }) });
  });
});
