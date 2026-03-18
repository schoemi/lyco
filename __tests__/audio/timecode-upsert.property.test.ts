/**
 * @vitest-environment jsdom
 */

/**
 * Property 11: Timecode-Upsert erstellt oder aktualisiert Markup
 *
 * Für jede Strophe und jeden gültigen Timecode-Wert: Wenn kein TIMECODE-Markup
 * existiert, soll ein neues erstellt werden. Wenn bereits eines existiert, soll
 * der timecodeMs-Wert aktualisiert werden. In beiden Fällen soll genau ein
 * TIMECODE-Markup pro Strophe existieren.
 *
 * **Validates: Requirements 6.2**
 */
// Feature: audio-playback-timecodes, Property 11: Timecode-Upsert erstellt oder aktualisiert Markup

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import fc from "fast-check";
import TimecodeEingabe from "@/components/songs/timecode-eingabe";

// Generator: valid timecode strings [mm:ss] with mm ∈ [0,99], ss ∈ [0,59]
const validTimecodeStr = fc
  .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([mm, ss]) =>
      `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}]`,
  );

// Generator: strophe IDs
const stropheIdArb = fc
  .stringMatching(/^[a-z][a-z0-9]{4,19}$/)
  .filter((s) => s.length >= 5);

// Generator: pair of distinct valid timecodes for create then update
const twoDistinctTimecodes = fc
  .tuple(validTimecodeStr, validTimecodeStr)
  .filter(([a, b]) => a !== b);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Property 11: Timecode-Upsert erstellt oder aktualisiert Markup", () => {
  it("first save POSTs to /api/markups, second save PUTs to /api/markups/[id] — exactly one markup per strophe", async () => {
    await fc.assert(
      fc.asyncProperty(stropheIdArb, twoDistinctTimecodes, async (stropheId, [tc1, tc2]) => {
        cleanup();
        vi.restoreAllMocks();

        // Track all fetch calls for this iteration
        const fetchCalls: { url: string; method: string; body: unknown }[] = [];
        const markupId = `markup-${stropheId}`;

        const mockFetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
          const body = init.body ? JSON.parse(init.body as string) : null;
          fetchCalls.push({ url, method: init.method || "GET", body });

          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                markup: { id: markupId, timecodeMs: body?.timecodeMs ?? 0 },
              }),
          });
        });
        global.fetch = mockFetch;

        const onTimecodeChanged = vi.fn();

        // Render component
        const { unmount } = render(
          React.createElement(TimecodeEingabe, {
            stropheId,
            initialTimecodeMs: null,
            onTimecodeChanged,
          }),
        );

        const input = screen.getByPlaceholderText("[mm:ss]");

        // --- First save: should POST (create) ---
        fireEvent.change(input, { target: { value: tc1 } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
          expect(onTimecodeChanged).toHaveBeenCalledTimes(1);
        });

        // Verify first call was POST to /api/markups
        expect(fetchCalls).toHaveLength(1);
        expect(fetchCalls[0].method).toBe("POST");
        expect(fetchCalls[0].url).toBe("/api/markups");
        expect(fetchCalls[0].body).toEqual(
          expect.objectContaining({
            typ: "TIMECODE",
            ziel: "STROPHE",
            stropheId,
          }),
        );

        // --- Second save: should PUT (update) ---
        fireEvent.change(input, { target: { value: tc2 } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
          expect(onTimecodeChanged).toHaveBeenCalledTimes(2);
        });

        // Verify second call was PUT to /api/markups/[id]
        expect(fetchCalls).toHaveLength(2);
        expect(fetchCalls[1].method).toBe("PUT");
        expect(fetchCalls[1].url).toBe(`/api/markups/${markupId}`);

        // Invariant: exactly one markup per strophe — only 1 POST + 1 PUT,
        // never a second POST (which would create a duplicate)
        const postCalls = fetchCalls.filter((c) => c.method === "POST");
        const putCalls = fetchCalls.filter((c) => c.method === "PUT");
        expect(postCalls).toHaveLength(1);
        expect(putCalls).toHaveLength(1);

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
