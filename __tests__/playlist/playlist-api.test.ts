/**
 * API-Tests für GET /api/sets/:id/playlist
 *
 * Testen:
 * - 200 mit korrekt gefilterter und sortierter Song-Liste
 * - 403 bei fremdem Set
 * - 404 bei nicht-existentem Set
 * - 401 bei fehlendem Session-Token
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Auth mock ---
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// --- Service mock ---
const mockGetSetPlaylist = vi.fn();
vi.mock("@/lib/services/set-service", () => ({
  getSetPlaylist: (...args: unknown[]) => mockGetSetPlaylist(...args),
}));

import { GET } from "@/app/api/sets/[id]/playlist/route";

// --- Helpers ---

const authenticatedSession = {
  user: { id: "user-1", email: "user@test.com", name: "Test User" },
};

function makeRequest(setId: string): NextRequest {
  return new NextRequest(
    new URL(`/api/sets/${setId}/playlist`, "http://localhost:3000"),
    { method: "GET" }
  );
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function makeMp3Quelle(id: string, rolle: string = "STANDARD") {
  return {
    id,
    url: `https://example.com/${id}.mp3`,
    typ: "MP3",
    label: "Original",
    orderIndex: 0,
    rolle,
  };
}

function makePlaylistSong(
  id: string,
  titel: string,
  orderIndex: number,
  audioQuellen: ReturnType<typeof makeMp3Quelle>[] = []
) {
  return {
    id,
    titel,
    kuenstler: null,
    orderIndex,
    audioQuellen: audioQuellen.length > 0 ? audioQuellen : [makeMp3Quelle(`aq-${id}`)],
  };
}

const samplePlaylistResponse = {
  setId: "set-1",
  setName: "Konzert März 2025",
  songs: [
    makePlaylistSong("song-1", "Alpha", 0),
    makePlaylistSong("song-2", "Beta", 1),
    makePlaylistSong("song-3", "Gamma", 2),
  ],
  skippedSongCount: 0,
};

// --- Tests ---

describe("GET /api/sets/:id/playlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession);
  });

  // ─── 401 Unauthenticated ───

  describe("401 – nicht authentifiziert", () => {
    it("returns 401 when no session exists", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Nicht authentifiziert");
    });

    it("does not call getSetPlaylist when unauthenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("set-1");
      await GET(req, makeParams("set-1"));
      expect(mockGetSetPlaylist).not.toHaveBeenCalled();
    });
  });

  // ─── 404 Set nicht gefunden ───

  describe("404 – Set nicht gefunden", () => {
    it("returns 404 when set does not exist", async () => {
      mockGetSetPlaylist.mockRejectedValue(new Error("Set nicht gefunden"));
      const req = makeRequest("set-nonexistent");
      const res = await GET(req, makeParams("set-nonexistent"));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Set nicht gefunden");
    });

    it("calls getSetPlaylist with the correct setId", async () => {
      mockGetSetPlaylist.mockRejectedValue(new Error("Set nicht gefunden"));
      const req = makeRequest("set-abc-123");
      await GET(req, makeParams("set-abc-123"));
      expect(mockGetSetPlaylist).toHaveBeenCalledWith("user-1", "set-abc-123");
    });
  });

  // ─── 403 Zugriff verweigert ───

  describe("403 – fremdes Set", () => {
    it("returns 403 when set belongs to a different user", async () => {
      mockGetSetPlaylist.mockRejectedValue(new Error("Zugriff verweigert"));
      const req = makeRequest("set-foreign");
      const res = await GET(req, makeParams("set-foreign"));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Zugriff verweigert");
    });
  });

  // ─── 200 Erfolg ───

  describe("200 – erfolgreiche Playlist-Antwort", () => {
    it("returns 200 with the playlist response", async () => {
      mockGetSetPlaylist.mockResolvedValue(samplePlaylistResponse);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      expect(res.status).toBe(200);
    });

    it("returns setId, setName, songs, and skippedSongCount in the response body", async () => {
      mockGetSetPlaylist.mockResolvedValue(samplePlaylistResponse);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      const json = await res.json();
      expect(json.setId).toBe("set-1");
      expect(json.setName).toBe("Konzert März 2025");
      expect(json.songs).toHaveLength(3);
      expect(json.skippedSongCount).toBe(0);
    });

    it("returns songs filtered to only those with MP3 sources (Req. 1.2)", async () => {
      const filteredResponse = {
        setId: "set-1",
        setName: "Gemischtes Set",
        songs: [
          makePlaylistSong("song-1", "Mit MP3", 0),
          makePlaylistSong("song-3", "Auch mit MP3", 2),
        ],
        skippedSongCount: 1, // one song without MP3 was skipped
      };
      mockGetSetPlaylist.mockResolvedValue(filteredResponse);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      const json = await res.json();
      expect(json.songs).toHaveLength(2);
      expect(json.skippedSongCount).toBe(1);
      // All returned songs must have audioQuellen
      json.songs.forEach((song: { audioQuellen: unknown[] }) => {
        expect(song.audioQuellen.length).toBeGreaterThan(0);
      });
    });

    it("returns songs sorted by orderIndex ascending (Req. 1.5)", async () => {
      const sortedResponse = {
        setId: "set-1",
        setName: "Sortiertes Set",
        songs: [
          makePlaylistSong("song-a", "Erstes Lied", 0),
          makePlaylistSong("song-b", "Zweites Lied", 1),
          makePlaylistSong("song-c", "Drittes Lied", 2),
        ],
        skippedSongCount: 0,
      };
      mockGetSetPlaylist.mockResolvedValue(sortedResponse);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      const json = await res.json();
      expect(json.songs[0].orderIndex).toBe(0);
      expect(json.songs[1].orderIndex).toBe(1);
      expect(json.songs[2].orderIndex).toBe(2);
    });

    it("returns songs with tiebreaker sort by titel when orderIndex is equal (Req. 1.5)", async () => {
      const tiebreakerResponse = {
        setId: "set-1",
        setName: "Tiebreaker Set",
        songs: [
          makePlaylistSong("song-a", "Alpha", 0),
          makePlaylistSong("song-b", "Beta", 0),
          makePlaylistSong("song-c", "Gamma", 0),
        ],
        skippedSongCount: 0,
      };
      mockGetSetPlaylist.mockResolvedValue(tiebreakerResponse);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      const json = await res.json();
      expect(json.songs[0].titel).toBe("Alpha");
      expect(json.songs[1].titel).toBe("Beta");
      expect(json.songs[2].titel).toBe("Gamma");
    });

    it("returns empty songs array with skippedSongCount when no songs have MP3 sources (Req. 1.2)", async () => {
      const emptyResponse = {
        setId: "set-1",
        setName: "Kein MP3 Set",
        songs: [],
        skippedSongCount: 3,
      };
      mockGetSetPlaylist.mockResolvedValue(emptyResponse);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      const json = await res.json();
      expect(json.songs).toHaveLength(0);
      expect(json.skippedSongCount).toBe(3);
    });

    it("returns song details including audioQuellen with correct fields", async () => {
      const responseWithAudio = {
        setId: "set-1",
        setName: "Set mit Audio",
        songs: [
          {
            id: "song-1",
            titel: "Bohemian Rhapsody",
            kuenstler: "Queen",
            orderIndex: 0,
            audioQuellen: [
              {
                id: "aq-1",
                url: "https://example.com/bohemian.mp3",
                typ: "MP3",
                label: "Original",
                orderIndex: 0,
                rolle: "STANDARD",
              },
              {
                id: "aq-2",
                url: "https://example.com/bohemian-instrumental.mp3",
                typ: "MP3",
                label: "Instrumental",
                orderIndex: 1,
                rolle: "INSTRUMENTAL",
              },
            ],
          },
        ],
        skippedSongCount: 0,
      };
      mockGetSetPlaylist.mockResolvedValue(responseWithAudio);
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      const json = await res.json();
      const song = json.songs[0];
      expect(song.id).toBe("song-1");
      expect(song.titel).toBe("Bohemian Rhapsody");
      expect(song.kuenstler).toBe("Queen");
      expect(song.orderIndex).toBe(0);
      expect(song.audioQuellen).toHaveLength(2);
      expect(song.audioQuellen[0].rolle).toBe("STANDARD");
      expect(song.audioQuellen[1].rolle).toBe("INSTRUMENTAL");
    });

    it("passes the authenticated userId to getSetPlaylist", async () => {
      mockGetSetPlaylist.mockResolvedValue(samplePlaylistResponse);
      const req = makeRequest("set-1");
      await GET(req, makeParams("set-1"));
      expect(mockGetSetPlaylist).toHaveBeenCalledWith("user-1", "set-1");
    });

    it("returns empty set with 0 songs when set has no songs (Req. 1.6)", async () => {
      const emptySetResponse = {
        setId: "set-empty",
        setName: "Leeres Set",
        songs: [],
        skippedSongCount: 0,
      };
      mockGetSetPlaylist.mockResolvedValue(emptySetResponse);
      const req = makeRequest("set-empty");
      const res = await GET(req, makeParams("set-empty"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.songs).toHaveLength(0);
      expect(json.skippedSongCount).toBe(0);
    });
  });

  // ─── 500 Unerwarteter Fehler ───

  describe("500 – interner Serverfehler", () => {
    it("returns 500 on unexpected error", async () => {
      mockGetSetPlaylist.mockRejectedValue(new Error("Datenbankfehler"));
      const req = makeRequest("set-1");
      const res = await GET(req, makeParams("set-1"));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Interner Serverfehler");
    });
  });
});
