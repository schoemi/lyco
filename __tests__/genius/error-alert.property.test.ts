/**
 * @vitest-environment jsdom
 */

/**
 * Property 9: Fehlermeldungen werden im Alert-Bereich angezeigt
 *
 * Für jede Fehlermeldung, die von den Genius-API-Routen zurückgegeben wird,
 * soll die Such-UI die Meldung in einem sichtbaren Alert-Bereich (role="alert") anzeigen.
 *
 * Feature: genius-song-import, Property 9: Fehlermeldungen werden im Alert-Bereich angezeigt
 *
 * **Validates: Requirements 5.5**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { GeniusSearchPanel } from "@/components/import/genius-search-panel";

/**
 * Arbitrary that generates non-empty error message strings.
 * Uses printable ASCII to avoid encoding issues in DOM assertions.
 */
const arbErrorMessage = fc
  .stringMatching(/^[A-Za-z0-9 .,:;!?\-äöüÄÖÜß]{1,80}$/)
  .filter((s) => s.trim().length > 0);

describe("Feature: genius-song-import, Property 9: Fehlermeldungen werden im Alert-Bereich angezeigt", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("error messages from API responses are displayed inside an element with role='alert'", async () => {
    await fc.assert(
      fc.asyncProperty(arbErrorMessage, async (errorMessage) => {
        cleanup();

        // Mock fetch to return an error response with the generated message
        const fetchMock = vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: errorMessage }),
        });
        global.fetch = fetchMock;

        const onImportSuccess = vi.fn();
        const onError = vi.fn();

        render(
          React.createElement(GeniusSearchPanel, { onImportSuccess, onError })
        );

        // Type a valid search query (>= 2 chars) and submit
        const input = screen.getByLabelText("Genius-Suche");
        fireEvent.change(input, { target: { value: "test query" } });
        fireEvent.click(screen.getByLabelText("Suchen"));

        // Wait for the error to appear in an alert element
        await waitFor(() => {
          const alertEl = screen.getByRole("alert");
          expect(alertEl).toBeDefined();
          expect(alertEl.textContent).toContain(errorMessage);
        });
      }),
      { numRuns: 100 }
    );
  });
});
