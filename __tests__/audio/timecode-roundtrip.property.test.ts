/**
 * Property 4: Timecode Parse/Format Roundtrip
 *
 * Für jeden gültigen ms-Wert (0 ≤ ms < 6000000): `parseTimecode(formatTimecode(ms))`
 * ergibt den auf ganze Sekunden gerundeten Wert.
 * Für jeden gültigen Timecode-String `[mm:ss]`: `formatTimecode(parseTimecode(str))`
 * ergibt den ursprünglichen String.
 *
 * **Validates: Requirements 3.1, 3.2**
 */
// Feature: audio-playback-timecodes, Property 4: Timecode Parse/Format Roundtrip

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseTimecode, formatTimecode } from "@/lib/audio/timecode";

// Generator: valid ms values in range [0, 5999000]
const validTimecodeMs = fc.integer({ min: 0, max: 5999000 });

// Generator: valid timecode strings [mm:ss] with mm ∈ [0,99], ss ∈ [0,59]
const validTimecodeStr = fc
  .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([mm, ss]) =>
      `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}]`,
  );

describe("Property 4: Timecode Parse/Format Roundtrip", () => {
  it("parseTimecode(formatTimecode(ms)) returns ms rounded to whole seconds", () => {
    fc.assert(
      fc.property(validTimecodeMs, (ms) => {
        const formatted = formatTimecode(ms);
        const parsed = parseTimecode(formatted);

        // Rounded to nearest whole second in ms
        const expectedMs = Math.round(ms / 1000) * 1000;
        expect(parsed).toBe(expectedMs);
      }),
      { numRuns: 100 },
    );
  });

  it("formatTimecode(parseTimecode(str)) returns the original string", () => {
    fc.assert(
      fc.property(validTimecodeStr, (str) => {
        const parsed = parseTimecode(str);
        expect(parsed).not.toBeNull();

        const formatted = formatTimecode(parsed!);
        expect(formatted).toBe(str);
      }),
      { numRuns: 100 },
    );
  });
});
