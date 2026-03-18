import { searchSong, getLyrics } from "genius-lyrics-api";
import type { GeniusSearchResult } from "@/types/genius";

const MAX_RESULTS = 10;

/**
 * Searches for songs on Genius using the genius-lyrics-api package.
 * Returns at most 10 results with normalized fields.
 */
export async function searchSongs(
  query: string,
  apiKey: string
): Promise<GeniusSearchResult[]> {
  const results = await searchSong({
    apiKey,
    title: query,
    artist: " ",
    optimizeQuery: true,
    authHeader: true,
  });

  if (!results) {
    return [];
  }

  return results.slice(0, MAX_RESULTS).map((hit) => {
    const fullTitle = hit.title || "";
    // Genius full_title format: "Song Title by Artist Name"
    const byIndex = fullTitle.lastIndexOf(" by ");
    const title = byIndex !== -1 ? fullTitle.slice(0, byIndex).trim() : fullTitle;
    const artist = byIndex !== -1 ? fullTitle.slice(byIndex + 4).trim() : "";

    return {
      id: hit.id,
      title,
      artist,
      url: hit.url,
      albumArt: hit.albumArt || null,
    };
  });
}

/**
 * Fetches lyrics for a song from Genius using its URL.
 * Returns the raw lyrics text.
 */
export async function fetchLyrics(
  geniusUrl: string,
  _apiKey: string
): Promise<string> {
  const lyrics = await getLyrics(geniusUrl);

  if (!lyrics) {
    throw new Error("Keine gültigen Lyrics gefunden");
  }

  return lyrics;
}
