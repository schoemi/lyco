/**
 * Unit-Tests für Audio-Quellen API-Routen
 *
 * Testen: Auth-Fehler, Eigentümer-Prüfung, erfolgreiche CRUD-Operationen,
 * Validierungsfehler, 404 bei nicht gefundener Quelle
 *
 * Anforderungen: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Auth mock ---
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// --- Service mocks ---
const mockGetAudioQuellen = vi.fn();
const mockCreateAudioQuelle = vi.fn();
const mockUpdateAudioQuelle = vi.fn();
const mockDeleteAudioQuelle = vi.fn();
vi.mock("@/lib/services/audio-quelle-service", () => ({
  getAudioQuellen: (...args: unknown[]) => mockGetAudioQuellen(...args),
  createAudioQuelle: (...args: unknown[]) => mockCreateAudioQuelle(...args),
  updateAudioQuelle: (...args: unknown[]) => mockUpdateAudioQuelle(...args),
  deleteAudioQuelle: (...args: unknown[]) => mockDeleteAudioQuelle(...args),
}));

import {
  GET,
  POST,
} from "@/app/api/songs/[id]/audio-quellen/route";
import {
  PUT,
  DELETE,
} from "@/app/api/songs/[id]/audio-quellen/[quelleId]/route";

// --- Helpers ---
const authenticatedSession = {
  user: { id: "user-1", email: "user@test.com", name: "Test User" },
};

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}

const sampleQuelle = {
  id: "quelle-1",
  songId: "song-1",
  url: "https://example.com/song.mp3",
  typ: "MP3",
  label: "Original",
  orderIndex: 0,
  createdAt: new Date().toISOString(),
};

const sampleQuelle2 = {
  id: "quelle-2",
  songId: "song-1",
  url: "https://open.spotify.com/track/abc123",
  typ: "SPOTIFY",
  label: "Spotify Version",
  orderIndex: 1,
  createdAt: new Date().toISOString(),
};

describe("Audio-Quellen API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession);
  });

  // ─── GET /api/songs/[id]/audio-quellen ───

  describe("GET /api/songs/[id]/audio-quellen", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("GET", "/api/songs/song-1/audio-quellen");
      const res = await GET(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Nicht authentifiziert");
    });

    it("returns sorted audio quellen on success", async () => {
      mockGetAudioQuellen.mockResolvedValue([sampleQuelle, sampleQuelle2]);
      const req = makeRequest("GET", "/api/songs/song-1/audio-quellen");
      const res = await GET(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.audioQuellen).toHaveLength(2);
      expect(json.audioQuellen[0].orderIndex).toBe(0);
      expect(json.audioQuellen[1].orderIndex).toBe(1);
    });

    it("returns 403 when song belongs to different user", async () => {
      mockGetAudioQuellen.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("GET", "/api/songs/song-1/audio-quellen");
      const res = await GET(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });

    it("returns 404 when song not found", async () => {
      mockGetAudioQuellen.mockRejectedValue(new Error("Song nicht gefunden"));
      const req = makeRequest("GET", "/api/songs/song-999/audio-quellen");
      const res = await GET(req, makeParams({ id: "song-999" }));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Song nicht gefunden");
    });
  });

  // ─── POST /api/songs/[id]/audio-quellen ───

  describe("POST /api/songs/[id]/audio-quellen", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("POST", "/api/songs/song-1/audio-quellen", {
        url: "https://example.com/song.mp3",
        typ: "MP3",
        label: "Test",
      });
      const res = await POST(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(401);
    });

    it("returns 201 with created audio quelle", async () => {
      mockCreateAudioQuelle.mockResolvedValue(sampleQuelle);
      const req = makeRequest("POST", "/api/songs/song-1/audio-quellen", {
        url: "https://example.com/song.mp3",
        typ: "MP3",
        label: "Original",
      });
      const res = await POST(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("quelle-1");
      expect(json.url).toBe("https://example.com/song.mp3");
      expect(json.typ).toBe("MP3");
      expect(json.label).toBe("Original");
    });

    it("returns 400 for invalid URL (empty string)", async () => {
      const req = makeRequest("POST", "/api/songs/song-1/audio-quellen", {
        url: "",
        typ: "MP3",
        label: "Test",
      });
      const res = await POST(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Ungültige URL");
    });

    it("returns 400 for invalid audio type", async () => {
      const req = makeRequest("POST", "/api/songs/song-1/audio-quellen", {
        url: "https://example.com/song.mp3",
        typ: "WAV",
        label: "Test",
      });
      const res = await POST(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Ungültiger Audio-Typ");
    });

    it("returns 400 for missing label", async () => {
      const req = makeRequest("POST", "/api/songs/song-1/audio-quellen", {
        url: "https://example.com/song.mp3",
        typ: "MP3",
        label: "",
      });
      const res = await POST(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Label ist erforderlich");
    });

    it("returns 403 when song belongs to different user", async () => {
      mockCreateAudioQuelle.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("POST", "/api/songs/song-1/audio-quellen", {
        url: "https://example.com/song.mp3",
        typ: "MP3",
        label: "Test",
      });
      const res = await POST(req, makeParams({ id: "song-1" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });

    it("returns 404 when song not found", async () => {
      mockCreateAudioQuelle.mockRejectedValue(new Error("Song nicht gefunden"));
      const req = makeRequest("POST", "/api/songs/song-999/audio-quellen", {
        url: "https://example.com/song.mp3",
        typ: "MP3",
        label: "Test",
      });
      const res = await POST(req, makeParams({ id: "song-999" }));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Song nicht gefunden");
    });
  });

  // ─── PUT /api/songs/[id]/audio-quellen/[quelleId] ───

  describe("PUT /api/songs/[id]/audio-quellen/[quelleId]", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-1", {
        label: "Updated",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(401);
    });

    it("returns updated audio quelle", async () => {
      const updated = { ...sampleQuelle, label: "Updated Label" };
      mockUpdateAudioQuelle.mockResolvedValue(updated);
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-1", {
        label: "Updated Label",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.label).toBe("Updated Label");
    });

    it("returns 404 when audio quelle not found", async () => {
      mockUpdateAudioQuelle.mockRejectedValue(new Error("Audio-Quelle nicht gefunden"));
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-999", {
        label: "Updated",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-999" }));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Audio-Quelle nicht gefunden");
    });

    it("returns 403 when song belongs to different user", async () => {
      mockUpdateAudioQuelle.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-1", {
        label: "Updated",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });

    it("returns 400 for invalid URL in update", async () => {
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-1", {
        url: "",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Ungültige URL");
    });

    it("returns 400 for invalid audio type in update", async () => {
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-1", {
        typ: "FLAC",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Ungültiger Audio-Typ");
    });

    it("returns 400 for empty label in update", async () => {
      const req = makeRequest("PUT", "/api/songs/song-1/audio-quellen/quelle-1", {
        label: "   ",
      });
      const res = await PUT(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Label ist erforderlich");
    });
  });

  // ─── DELETE /api/songs/[id]/audio-quellen/[quelleId] ───

  describe("DELETE /api/songs/[id]/audio-quellen/[quelleId]", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("DELETE", "/api/songs/song-1/audio-quellen/quelle-1");
      const res = await DELETE(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(401);
    });

    it("returns { success: true } on successful delete", async () => {
      mockDeleteAudioQuelle.mockResolvedValue(undefined);
      const req = makeRequest("DELETE", "/api/songs/song-1/audio-quellen/quelle-1");
      const res = await DELETE(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 404 when audio quelle not found", async () => {
      mockDeleteAudioQuelle.mockRejectedValue(new Error("Audio-Quelle nicht gefunden"));
      const req = makeRequest("DELETE", "/api/songs/song-1/audio-quellen/quelle-999");
      const res = await DELETE(req, makeParams({ id: "song-1", quelleId: "quelle-999" }));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Audio-Quelle nicht gefunden");
    });

    it("returns 403 when song belongs to different user", async () => {
      mockDeleteAudioQuelle.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("DELETE", "/api/songs/song-1/audio-quellen/quelle-1");
      const res = await DELETE(req, makeParams({ id: "song-1", quelleId: "quelle-1" }));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });
  });
});
