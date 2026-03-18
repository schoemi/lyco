/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für CoverManager-Komponente
 *
 * Testen: Cover-Vorschau, URL-Eingabe, Datei-Upload, Entfernen,
 * Ladezustände, Fehlermeldungen, Modus-Umschaltung
 *
 * Anforderungen: 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import CoverManager from "@/components/songs/cover-manager";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SONG_ID = "song-42";

function renderCoverManager(
  coverUrl: string | null = null,
  onCoverChanged = vi.fn(),
) {
  return render(
    React.createElement(CoverManager, {
      songId: SONG_ID,
      coverUrl,
      onCoverChanged,
    }),
  );
}

/** Helper to create a mock successful fetch response */
function mockFetchOk(data: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    }),
  );
}

/** Helper to create a mock failed fetch response */
function mockFetchError(error = "Server error", status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error }),
    }),
  );
}

describe("CoverManager – Unit-Tests", () => {
  // Renders cover preview when coverUrl is provided
  describe("Cover-Vorschau", () => {
    it("zeigt Cover-Bild wenn coverUrl vorhanden", () => {
      renderCoverManager("https://example.com/cover.jpg");

      const img = screen.getByAltText("Cover-Bild") as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.src).toContain("https://example.com/cover.jpg");
    });

    it("zeigt keinen Cover-Bereich wenn coverUrl null", () => {
      renderCoverManager(null);

      expect(screen.queryByAltText("Cover-Bild")).toBeNull();
    });
  });

  // Toggle between URL and upload modes
  describe("Modus-Umschaltung", () => {
    it("zeigt URL-Eingabe als Standard-Modus", () => {
      renderCoverManager();

      expect(screen.getByLabelText("Cover-URL")).toBeDefined();
      expect(screen.getByRole("button", { name: "Speichern" })).toBeDefined();
    });

    it("wechselt zu Datei-Upload-Modus", () => {
      renderCoverManager();

      fireEvent.click(screen.getByText("Datei hochladen"));

      expect(screen.getByLabelText(/Bild-Datei/)).toBeDefined();
      expect(screen.getByRole("button", { name: "Hochladen" })).toBeDefined();
    });

    it("wechselt zurück zu URL-Modus", () => {
      renderCoverManager();

      fireEvent.click(screen.getByText("Datei hochladen"));
      fireEvent.click(screen.getByText("URL eingeben"));

      expect(screen.getByLabelText("Cover-URL")).toBeDefined();
    });
  });

  // URL input mode: entering a URL and clicking "Speichern" calls PUT endpoint
  describe("URL-Eingabe Modus", () => {
    it("ruft PUT-Endpunkt mit coverUrl auf beim Speichern", async () => {
      const onCoverChanged = vi.fn();
      mockFetchOk();

      renderCoverManager(null, onCoverChanged);

      fireEvent.change(screen.getByLabelText("Cover-URL"), {
        target: { value: "https://example.com/new-cover.jpg" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

      await waitFor(() => {
        expect(onCoverChanged).toHaveBeenCalledTimes(1);
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toBe(`/api/songs/${SONG_ID}`);
      expect(fetchCall[1].method).toBe("PUT");
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ coverUrl: "https://example.com/new-cover.jpg" });
    });
  });

  // File upload mode: uploading a file calls POST endpoint
  describe("Datei-Upload Modus", () => {
    it("ruft POST-Endpunkt mit FormData auf beim Hochladen", async () => {
      const onCoverChanged = vi.fn();
      mockFetchOk();

      renderCoverManager(null, onCoverChanged);

      fireEvent.click(screen.getByText("Datei hochladen"));

      const file = new File(["image-data"], "cover.jpg", { type: "image/jpeg" });
      const fileInput = document.getElementById("cover-file") as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByRole("button", { name: "Hochladen" }));

      await waitFor(() => {
        expect(onCoverChanged).toHaveBeenCalledTimes(1);
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toBe(`/api/songs/${SONG_ID}/cover/upload`);
      expect(fetchCall[1].method).toBe("POST");
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
    });
  });

  // "Entfernen" button calls PUT with { coverUrl: null }
  describe("Entfernen-Button", () => {
    it("ruft PUT mit coverUrl: null auf", async () => {
      const onCoverChanged = vi.fn();
      mockFetchOk();

      renderCoverManager("https://example.com/cover.jpg", onCoverChanged);

      fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));

      await waitFor(() => {
        expect(onCoverChanged).toHaveBeenCalledTimes(1);
      });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchCall[0]).toBe(`/api/songs/${SONG_ID}`);
      expect(fetchCall[1].method).toBe("PUT");
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ coverUrl: null });
    });

    it("ist nicht sichtbar wenn coverUrl null", () => {
      renderCoverManager(null);

      expect(screen.queryByRole("button", { name: "Entfernen" })).toBeNull();
    });
  });

  // Shows loading state during save/upload
  describe("Ladezustände", () => {
    it("zeigt 'Speichern...' während URL gespeichert wird", async () => {
      // Use a fetch that never resolves to keep loading state
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(new Promise(() => {})),
      );

      renderCoverManager();

      fireEvent.change(screen.getByLabelText("Cover-URL"), {
        target: { value: "https://example.com/cover.jpg" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Speichern..." })).toBeDefined();
      });
    });

    it("zeigt 'Hochladen...' während Datei hochgeladen wird", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(new Promise(() => {})),
      );

      renderCoverManager();

      fireEvent.click(screen.getByText("Datei hochladen"));

      const file = new File(["data"], "cover.jpg", { type: "image/jpeg" });
      const fileInput = document.getElementById("cover-file") as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByRole("button", { name: "Hochladen" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Hochladen..." })).toBeDefined();
      });
    });

    it("zeigt 'Entfernen...' während Cover entfernt wird", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(new Promise(() => {})),
      );

      renderCoverManager("https://example.com/cover.jpg");

      fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Entfernen..." })).toBeDefined();
      });
    });
  });

  // Shows error message on API failure
  describe("Fehlermeldungen", () => {
    it("zeigt Fehlermeldung bei API-Fehler (URL speichern)", async () => {
      mockFetchError("Ungültige URL");

      renderCoverManager();

      fireEvent.change(screen.getByLabelText("Cover-URL"), {
        target: { value: "https://example.com/cover.jpg" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toContain("Ungültige URL");
      });
    });

    it("zeigt Fehlermeldung bei API-Fehler (Entfernen)", async () => {
      mockFetchError("Fehler beim Entfernen");

      renderCoverManager("https://example.com/cover.jpg");

      fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toContain("Fehler beim Entfernen");
      });
    });
  });
});
