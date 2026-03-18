/**
 * @vitest-environment jsdom
 */

/**
 * Property 5: Kurze Suchbegriffe lösen keine Suche aus
 *
 * Für jeden Suchbegriff mit weniger als 2 Zeichen: keine API-Anfrage wird ausgelöst.
 *
 * Feature: genius-song-import, Property 5: Kurze Suchbegriffe lösen keine Suche aus
 *
 * **Validates: Requirements 2.5**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { GeniusSearchPanel } from "@/components/import/genius-search-panel";

describe("Feature: genius-song-import, Property 5: Kurze Suchbegriffe lösen keine Suche aus", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  /**
   * Arbitrary that generates short search terms whose trimmed length is < 2.
   * These should NOT trigger an API call per requirement 2.5.
   */
  const arbShortQuery = fc.oneof(
    // Empty string
    fc.constant(""),
    // Single character
    fc.string({ minLength: 1, maxLength: 1 }),
    // Whitespace-only strings (trim to "")
    fc.constantFrom(" ", "  ", "\t", " \t ", "   "),
    // Single char with surrounding whitespace (trims to 1 char)
    fc.tuple(
      fc.constantFrom("", " ", "  ", "\t"),
      fc.string({ minLength: 1, maxLength: 1 }),
      fc.constantFrom("", " ", "  ", "\t")
    ).map(([pre, c, post]) => `${pre}${c}${post}`)
  );

  it("no fetch call is made when submitting a search term shorter than 2 characters", async () => {
    await fc.assert(
      fc.asyncProperty(arbShortQuery, async (shortQuery) => {
        cleanup();
        fetchSpy.mockClear();

        const onImportSuccess = vi.fn();
        const onError = vi.fn();

        render(
          React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
        );

        const input = screen.getByLabelText("Genius-Suche");
        const submitButton = screen.getByLabelText("Suchen");

        // Set the input value
        fireEvent.change(input, { target: { value: shortQuery } });

        // Submit the form
        fireEvent.click(submitButton);

        // Verify no fetch call was made
        expect(fetchSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
