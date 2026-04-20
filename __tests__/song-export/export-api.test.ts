/**
 * Unit-Tests für Song-Export API-Route und Export-Service
 *
 * Testen: Auth-Fehler, Eigentümer-Prüfung, ungültiges Format,
 * korrekter Content-Type und Content-Disposition für jedes Format,
 * Rückwärtskompatibilität (kein format-Parameter → ZIP),
 * Query-Parameter-Weiterleitung (vocalTags, instrumental, kommentare)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Auth mock ---
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// --- Export-Service mocks ---
const mockExportSong = vi.fn();
const mockExportSongFormatted = vi.fn();
vi.mock("@/lib/services/export-service", () => ({
  exportSong: (...args: unknown[]) => mockExportSong(...args),
  exportSongFormatted: (...args: unknown[]) => mockExportSongFormatted(...args),
}));

import { GET } from "@/app/api/songs/[id]/export/route";

// --- Helpers ---
const authenticatedSession = {
  user: { id: "user-1", email: "user@test.com", name: "Test User" },
};

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method: "GET" });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("Song-Export API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession);
  });

  // ─── Authentifizierung ───

  describe("Authentifizierung (Requirement 8.4)", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/songs/song-1/export?format=pdf");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Nicht authentifiziert");
    });

    it("returns 401 when session has no user", async () => {
      mockAuth.mockResolvedValue({ user: null });
      const req = makeRequest("/api/songs/song-1/export?format=pdf");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(401);
    });
  });

  // ─── Ungültiges Format ───

  describe("Ungültiges Format (Requirement 8.3)", () => {
    it("returns 400 for invalid format parameter", async () => {
      const req = makeRequest("/api/songs/song-1/export?format=invalid");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe(
        "Ungültiges Export-Format. Erlaubt: pdf, chordpro, onsong, songbookpro"
      );
    });

    it("returns 400 for format=zip", async () => {
      const req = makeRequest("/api/songs/song-1/export?format=zip");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(400);
    });

    it("returns 400 for format=docx", async () => {
      const req = makeRequest("/api/songs/song-1/export?format=docx");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(400);
    });
  });

  // ─── Eigentümerschaft (403) ───

  describe("Eigentümerschaft (Requirement 8.5)", () => {
    it("returns 403 when song belongs to different user", async () => {
      mockExportSongFormatted.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("/api/songs/song-1/export?format=pdf");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });
  });

  // ─── Song nicht gefunden (404) ───

  describe("Song nicht gefunden (Requirement 8.6)", () => {
    it("returns 404 when song does not exist", async () => {
      mockExportSongFormatted.mockRejectedValue(new Error("Song nicht gefunden"));
      const req = makeRequest("/api/songs/song-999/export?format=chordpro");
      const res = await GET(req, makeParams("song-999"));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Song nicht gefunden");
    });
  });

  // ─── Unerwarteter Fehler (500) ───

  describe("Unerwarteter Fehler (Requirement 8.7)", () => {
    it("returns 500 on unexpected error from exportSongFormatted", async () => {
      mockExportSongFormatted.mockRejectedValue(new Error("Database connection lost"));
      const req = makeRequest("/api/songs/song-1/export?format=pdf");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Interner Serverfehler");
    });

    it("returns 500 on unexpected error from exportSong (ZIP)", async () => {
      mockExportSong.mockRejectedValue(new Error("Unexpected failure"));
      const req = makeRequest("/api/songs/song-1/export");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Interner Serverfehler");
    });
  });

  // ─── Rückwärtskompatibilität (kein format → ZIP) ───

  describe("Rückwärtskompatibilität (Requirement 8.1, 8.3)", () => {
    it("calls exportSong (ZIP) when no format parameter is provided", async () => {
      const zipBuffer = Buffer.from("fake-zip-content");
      mockExportSong.mockResolvedValue(zipBuffer);

      const req = makeRequest("/api/songs/song-1/export");
      const res = await GET(req, makeParams("song-1"));

      expect(res.status).toBe(200);
      expect(mockExportSong).toHaveBeenCalledWith("user-1", "song-1");
      expect(mockExportSongFormatted).not.toHaveBeenCalled();
      expect(res.headers.get("Content-Type")).toBe("application/zip");
      expect(res.headers.get("Content-Disposition")).toContain("song-1.zip");
    });
  });

  // ─── Korrekter Content-Type und Content-Disposition pro Format ───

  describe("Content-Type und Content-Disposition (Requirements 8.1, 9.4)", () => {
    const formatCases: Array<{
      format: string;
      contentType: string;
      filename: string;
    }> = [
      {
        format: "pdf",
        contentType: "application/pdf",
        filename: "Test Song - Test Artist.pdf",
      },
      {
        format: "chordpro",
        contentType: "text/plain; charset=utf-8",
        filename: "Test Song - Test Artist.cho",
      },
      {
        format: "onsong",
        contentType: "text/plain; charset=utf-8",
        filename: "Test Song - Test Artist.onsong",
      },
      {
        format: "songbookpro",
        contentType: "text/plain; charset=utf-8",
        filename: "Test Song - Test Artist.sbp",
      },
    ];

    for (const { format, contentType, filename } of formatCases) {
      it(`returns correct Content-Type and Content-Disposition for format=${format}`, async () => {
        const data = Buffer.from(`fake-${format}-content`);
        mockExportSongFormatted.mockResolvedValue({
          data,
          filename,
          contentType,
        });

        const req = makeRequest(`/api/songs/song-1/export?format=${format}`);
        const res = await GET(req, makeParams("song-1"));

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe(contentType);
        expect(res.headers.get("Content-Disposition")).toBe(
          `attachment; filename="${filename}"`
        );
        expect(res.headers.get("Content-Length")).toBe(String(data.length));
      });
    }
  });

  // ─── Export-Optionen Query-Parameter ───

  describe("Export-Optionen (Requirement 8.2)", () => {
    it("passes vocalTags, instrumental, kommentare options to exportSongFormatted", async () => {
      const data = Buffer.from("pdf-content");
      mockExportSongFormatted.mockResolvedValue({
        data,
        filename: "Song.pdf",
        contentType: "application/pdf",
      });

      const req = makeRequest(
        "/api/songs/song-1/export?format=pdf&vocalTags=false&instrumental=false&kommentare=false"
      );
      const res = await GET(req, makeParams("song-1"));

      expect(res.status).toBe(200);
      expect(mockExportSongFormatted).toHaveBeenCalledWith(
        "user-1",
        "song-1",
        "pdf",
        { vocalTags: false, instrumental: false, kommentare: false }
      );
    });

    it("defaults all options to true when not specified", async () => {
      const data = Buffer.from("chordpro-content");
      mockExportSongFormatted.mockResolvedValue({
        data,
        filename: "Song.cho",
        contentType: "text/plain; charset=utf-8",
      });

      const req = makeRequest("/api/songs/song-1/export?format=chordpro");
      const res = await GET(req, makeParams("song-1"));

      expect(res.status).toBe(200);
      expect(mockExportSongFormatted).toHaveBeenCalledWith(
        "user-1",
        "song-1",
        "chordpro",
        { vocalTags: true, instrumental: true, kommentare: true }
      );
    });

    it("handles mixed option values correctly", async () => {
      const data = Buffer.from("onsong-content");
      mockExportSongFormatted.mockResolvedValue({
        data,
        filename: "Song.onsong",
        contentType: "text/plain; charset=utf-8",
      });

      const req = makeRequest(
        "/api/songs/song-1/export?format=onsong&vocalTags=true&instrumental=false&kommentare=true"
      );
      const res = await GET(req, makeParams("song-1"));

      expect(res.status).toBe(200);
      expect(mockExportSongFormatted).toHaveBeenCalledWith(
        "user-1",
        "song-1",
        "onsong",
        { vocalTags: true, instrumental: false, kommentare: true }
      );
    });
  });

  // ─── 403/404 bei ZIP-Export (Rückwärtskompatibilität) ───

  describe("Fehlerbehandlung bei ZIP-Export", () => {
    it("returns 404 when song not found during ZIP export", async () => {
      mockExportSong.mockRejectedValue(new Error("Song nicht gefunden"));
      const req = makeRequest("/api/songs/song-999/export");
      const res = await GET(req, makeParams("song-999"));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Song nicht gefunden");
    });

    it("returns 403 when not owner during ZIP export", async () => {
      mockExportSong.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("/api/songs/song-1/export");
      const res = await GET(req, makeParams("song-1"));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });
  });
});
