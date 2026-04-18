import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { searchSongs, fetchLyrics } from "@/lib/genius/client";

/** Helper to create a mock Response for the Genius search API */
function mockSearchResponse(hits: Array<{ id: number; full_title: string; url: string; song_art_image_url: string }>) {
  return {
    ok: true,
    json: () => Promise.resolve({
      response: {
        hits: hits.map((h) => ({ result: h })),
      },
    }),
  };
}

/** Helper to create a mock Response for lyrics page HTML */
function mockLyricsPage(lyrics: string) {
  // Simulate the Lyrics__Container format Genius uses
  const html = `<html><body><div class="Lyrics__Container-sc">${lyrics.replace(/\n/g, "<br>")}</div></body></html>`;
  return {
    ok: true,
    text: () => Promise.resolve(html),
  };
}

describe("genius-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchSongs", () => {
    it("returns normalized results on successful search", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSearchResponse([
          {
            id: 123,
            full_title: "Bohemian Rhapsody by Queen",
            url: "https://genius.com/queen-bohemian-rhapsody-lyrics",
            song_art_image_url: "https://images.genius.com/cover.jpg",
          },
          {
            id: 456,
            full_title: "Stairway to Heaven by Led Zeppelin",
            url: "https://genius.com/led-zeppelin-stairway-to-heaven-lyrics",
            song_art_image_url: "",
          },
        ])
      );

      const results = await searchSongs("bohemian", "test-api-key");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.genius.com/search?q=bohemian"),
        expect.objectContaining({
          headers: { Authorization: "Bearer test-api-key" },
        })
      );
      expect(results).toEqual([
        {
          id: 123,
          title: "Bohemian Rhapsody",
          artist: "Queen",
          url: "https://genius.com/queen-bohemian-rhapsody-lyrics",
          albumArt: "https://images.genius.com/cover.jpg",
        },
        {
          id: 456,
          title: "Stairway to Heaven",
          artist: "Led Zeppelin",
          url: "https://genius.com/led-zeppelin-stairway-to-heaven-lyrics",
          albumArt: null,
        },
      ]);
    });

    it("returns empty array when API returns no hits", async () => {
      mockFetch.mockResolvedValueOnce(mockSearchResponse([]));

      const results = await searchSongs("nonexistent", "test-api-key");

      expect(results).toEqual([]);
    });

    it("throws on API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      await expect(searchSongs("test", "test-api-key")).rejects.toThrow(
        "Genius API error: 429 Too Many Requests"
      );
    });

    it("propagates network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(searchSongs("test", "test-api-key")).rejects.toThrow(
        "Network timeout"
      );
    });

    it("handles title without ' by ' separator", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSearchResponse([
          {
            id: 789,
            full_title: "Just A Title",
            url: "https://genius.com/some-lyrics",
            song_art_image_url: "https://images.genius.com/art.jpg",
          },
        ])
      );

      const results = await searchSongs("title", "test-api-key");

      expect(results[0].title).toBe("Just A Title");
      expect(results[0].artist).toBe("");
    });
  });

  describe("fetchLyrics", () => {
    it("returns lyrics text on success", async () => {
      const lyricsText = "[Verse 1]\nHello world\nThis is a song";
      mockFetch.mockResolvedValueOnce(mockLyricsPage(lyricsText));

      const result = await fetchLyrics(
        "https://genius.com/queen-bohemian-rhapsody-lyrics",
        "test-api-key"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://genius.com/queen-bohemian-rhapsody-lyrics"
      );
      expect(result).toContain("[Verse 1]");
      expect(result).toContain("Hello world");
    });

    it("throws when no lyrics found on page", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("<html><body><div>No lyrics here</div></body></html>"),
      });

      await expect(
        fetchLyrics("https://genius.com/some-song", "test-api-key")
      ).rejects.toThrow("Keine gültigen Lyrics gefunden");
    });

    it("throws on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        fetchLyrics("https://genius.com/some-song", "test-api-key")
      ).rejects.toThrow("Failed to fetch Genius page: 404");
    });

    it("propagates network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        fetchLyrics("https://genius.com/some-song", "test-api-key")
      ).rejects.toThrow("Network timeout");
    });
  });
});
