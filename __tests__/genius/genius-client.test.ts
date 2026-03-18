import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock genius-lyrics-api before importing the client
vi.mock("genius-lyrics-api", () => ({
  searchSong: vi.fn(),
  getLyrics: vi.fn(),
}));

import { searchSongs, fetchLyrics } from "@/lib/genius/client";
import { searchSong, getLyrics } from "genius-lyrics-api";

const mockedSearchSong = vi.mocked(searchSong);
const mockedGetLyrics = vi.mocked(getLyrics);

describe("genius-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchSongs", () => {
    it("returns normalized results on successful search", async () => {
      mockedSearchSong.mockResolvedValueOnce([
        {
          id: 123,
          title: "Bohemian Rhapsody by Queen",
          url: "https://genius.com/queen-bohemian-rhapsody-lyrics",
          albumArt: "https://images.genius.com/cover.jpg",
        },
        {
          id: 456,
          title: "Stairway to Heaven by Led Zeppelin",
          url: "https://genius.com/led-zeppelin-stairway-to-heaven-lyrics",
          albumArt: "",
        },
      ]);

      const results = await searchSongs("bohemian", "test-api-key");

      expect(mockedSearchSong).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        title: "bohemian",
        artist: " ",
        optimizeQuery: true,
        authHeader: true,
      });
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

    it("returns empty array when API returns null", async () => {
      mockedSearchSong.mockResolvedValueOnce(null);

      const results = await searchSongs("nonexistent", "test-api-key");

      expect(results).toEqual([]);
    });

    it("returns empty array when API returns empty list", async () => {
      mockedSearchSong.mockResolvedValueOnce([]);

      const results = await searchSongs("nothing", "test-api-key");

      expect(results).toEqual([]);
    });

    it("propagates API errors", async () => {
      mockedSearchSong.mockRejectedValueOnce(new Error("Genius API rate limit"));

      await expect(searchSongs("test", "test-api-key")).rejects.toThrow(
        "Genius API rate limit"
      );
    });

    it("handles title without ' by ' separator", async () => {
      mockedSearchSong.mockResolvedValueOnce([
        {
          id: 789,
          title: "Just A Title",
          url: "https://genius.com/some-lyrics",
          albumArt: "https://images.genius.com/art.jpg",
        },
      ]);

      const results = await searchSongs("title", "test-api-key");

      expect(results[0].title).toBe("Just A Title");
      expect(results[0].artist).toBe("");
    });
  });

  describe("fetchLyrics", () => {
    it("returns lyrics text on success", async () => {
      const lyricsText = "[Verse 1]\nHello world\nThis is a song\n\n[Chorus]\nLa la la";
      mockedGetLyrics.mockResolvedValueOnce(lyricsText);

      const result = await fetchLyrics(
        "https://genius.com/queen-bohemian-rhapsody-lyrics",
        "test-api-key"
      );

      expect(mockedGetLyrics).toHaveBeenCalledWith(
        "https://genius.com/queen-bohemian-rhapsody-lyrics"
      );
      expect(result).toBe(lyricsText);
    });

    it("throws when getLyrics returns null", async () => {
      mockedGetLyrics.mockResolvedValueOnce(null);

      await expect(
        fetchLyrics("https://genius.com/some-song", "test-api-key")
      ).rejects.toThrow("Keine gültigen Lyrics gefunden");
    });

    it("propagates API errors from getLyrics", async () => {
      mockedGetLyrics.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        fetchLyrics("https://genius.com/some-song", "test-api-key")
      ).rejects.toThrow("Network timeout");
    });
  });
});
