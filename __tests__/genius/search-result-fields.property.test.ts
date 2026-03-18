/**
 * @vitest-environment jsdom
 */

/**
 * Property 6: Suchergebnisse enthalten alle Pflichtfelder
 *
 * Für jedes GeniusSearchResult: gerenderte Darstellung enthält Titel, Künstler und Album-Cover (falls vorhanden).
 *
 * Feature: genius-song-import, Property 6: Suchergebnisse enthalten alle Pflichtfelder
 *
 * **Validates: Requirements 2.3**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { GeniusSearchPanel } from "@/components/import/genius-search-panel";
import type { GeniusSearchResult } from "@/types/genius";

/**
 * Arbitrary that generates a valid GeniusSearchResult.
 * Uses simple alphanumeric strings (no internal whitespace) with unique prefixes
 * to avoid DOM query ambiguity.
 */
const arbGeniusSearchResult: fc.Arbitrary<GeniusSearchResult> = fc
  .record({
    id: fc.integer({ min: 1, max: 999999 }),
    titleSuffix: fc.stringMatching(/^[A-Za-z0-9]{1,20}$/),
    artistSuffix: fc.stringMatching(/^[A-Za-z0-9]{1,20}$/),
    url: fc.webUrl(),
    albumArt: fc.oneof(
      fc.constant(null),
      fc.webUrl().map((u) => `${u}/image.jpg`)
    ),
  })
  .map((r) => ({
    id: r.id,
    title: `Song ${r.id} ${r.titleSuffix}`,
    artist: `Artist ${r.id} ${r.artistSuffix}`,
    url: r.url,
    albumArt: r.albumArt,
  }));

/**
 * Arbitrary that generates a non-empty array of 1-5 search results with unique IDs.
 */
const arbSearchResults: fc.Arbitrary<GeniusSearchResult[]> = fc
  .array(arbGeniusSearchResult, { minLength: 1, maxLength: 5 })
  .map((results) => {
    const seenIds = new Set<number>();
    return results.filter((r) => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });
  })
  .filter((results) => results.length > 0);

describe("Feature: genius-song-import, Property 6: Suchergebnisse enthalten alle Pflichtfelder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendered search results contain title, artist, and album art (if present) for every result", async () => {
    await fc.assert(
      fc.asyncProperty(arbSearchResults, async (results) => {
        cleanup();

        // Mock fetch to return the generated results
        const fetchMock = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ results }),
        });
        global.fetch = fetchMock;

        const onImportSuccess = vi.fn();
        const onError = vi.fn();

        const { container } = render(
          React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
        );

        // Type a valid search query and submit
        const input = screen.getByLabelText("Genius-Suche");
        fireEvent.change(input, { target: { value: "test query" } });
        fireEvent.click(screen.getByLabelText("Suchen"));

        // Wait for results to render by checking for list items
        await waitFor(() => {
          const items = container.querySelectorAll("li");
          expect(items.length).toBe(results.length);
        });

        // Get all list items and verify each one
        const listItems = container.querySelectorAll("li");

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const li = listItems[i];

          // Title must be present in the list item's text content
          expect(li.textContent).toContain(result.title);

          // Artist must be present in the list item's text content
          expect(li.textContent).toContain(result.artist);

          // If albumArt is present, verify an img element with that src exists
          if (result.albumArt) {
            const img = li.querySelector("img");
            expect(img).not.toBeNull();
            expect(img!.getAttribute("src")).toBe(result.albumArt);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
