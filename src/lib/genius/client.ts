import * as cheerio from "cheerio";
import type { GeniusSearchResult } from "@/types/genius";

const MAX_RESULTS = 10;
const GENIUS_SEARCH_URL = "https://api.genius.com/search?q=";

interface GeniusHit {
  result: {
    id: number;
    full_title: string;
    song_art_image_url: string;
    url: string;
  };
}

/**
 * Searches for songs on Genius using the Genius REST API directly.
 * Returns at most 10 results with normalized fields.
 */
export async function searchSongs(
  query: string,
  apiKey: string
): Promise<GeniusSearchResult[]> {
  const reqUrl = `${GENIUS_SEARCH_URL}${encodeURIComponent(query)}`;
  const response = await fetch(reqUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Genius API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const hits: GeniusHit[] = data?.response?.hits ?? [];

  if (hits.length === 0) {
    return [];
  }

  return hits.slice(0, MAX_RESULTS).map((hit) => {
    const fullTitle = hit.result.full_title || "";
    // Genius full_title format: "Song Title by Artist Name"
    const byIndex = fullTitle.lastIndexOf(" by ");
    const title = byIndex !== -1 ? fullTitle.slice(0, byIndex).trim() : fullTitle;
    const artist = byIndex !== -1 ? fullTitle.slice(byIndex + 4).trim() : "";

    return {
      id: hit.result.id,
      title,
      artist,
      url: hit.result.url,
      albumArt: hit.result.song_art_image_url || null,
    };
  });
}

/**
 * Fetches lyrics for a song from Genius by scraping the song page.
 * Uses cheerio for HTML parsing instead of the deprecated cheerio-without-node-native.
 * Returns the raw lyrics text.
 */
export async function fetchLyrics(
  geniusUrl: string,
  _apiKey: string
): Promise<string> {
  const response = await fetch(geniusUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch Genius page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Try the legacy lyrics container first
  let lyrics = $('div[class="lyrics"]').text().trim();

  // Fall back to the newer Lyrics__Container divs
  if (!lyrics) {
    lyrics = "";
    $('div[class^="Lyrics__Container"]').each((_i, elem) => {
      if ($(elem).text().length !== 0) {
        const snippet = $(elem)
          .html()!
          .replace(/<br>/g, "\n")
          .replace(/<(?!\s*br\s*\/?)[^>]+>/gi, "");
        lyrics += $("<textarea/>").html(snippet).text().trim() + "\n\n";
      }
    });
  }

  lyrics = lyrics.trim();

  if (!lyrics) {
    throw new Error("Keine gültigen Lyrics gefunden");
  }

  return lyrics;
}
