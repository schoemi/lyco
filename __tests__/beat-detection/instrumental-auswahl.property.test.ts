/**
 * Property 11: Instrumental-Quellen-Auswahl
 *
 * Für jedes Array von AudioQuellen, das mindestens eine Quelle mit Rolle INSTRUMENTAL
 * enthält, soll die Auswahlfunktion die Quelle mit dem niedrigsten orderIndex
 * unter allen INSTRUMENTAL-Quellen zurückgeben.
 *
 * **Validates: Requirements 9.1, 9.3**
 *
 * Feature: beat-detection, Property 11: Instrumental-Quellen-Auswahl
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { findeInstrumentalQuelle } from "@/lib/beat-detection/beat-utils";
import type { AudioQuelleResponse } from "@/types/audio";

// Generator: AudioQuelleResponse with a specific rolle
const audioQuelleArb = (rolle: "STANDARD" | "INSTRUMENTAL" | "REFERENZ_VOKAL") =>
  fc.record({
    id: fc.uuid(),
    url: fc.webUrl(),
    typ: fc.constantFrom("MP3" as const, "SPOTIFY" as const, "YOUTUBE" as const, "APPLE_MUSIC" as const),
    label: fc.string({ minLength: 1, maxLength: 50 }),
    orderIndex: fc.integer({ min: 0, max: 100 }),
    rolle: fc.constant(rolle),
  });

// Generator: Array with at least one INSTRUMENTAL source
const audioQuellenMitInstrumental = fc
  .tuple(
    fc.array(
      fc.oneof(
        audioQuelleArb("STANDARD"),
        audioQuelleArb("INSTRUMENTAL"),
        audioQuelleArb("REFERENZ_VOKAL"),
      ),
      { minLength: 0, maxLength: 10 },
    ),
    audioQuelleArb("INSTRUMENTAL"), // Ensure at least one INSTRUMENTAL
  )
  .map(([quellen, instrumental]) => [...quellen, instrumental]);

// Generator: Array without any INSTRUMENTAL source
const audioQuellenOhneInstrumental = fc.array(
  fc.oneof(
    audioQuelleArb("STANDARD"),
    audioQuelleArb("REFERENZ_VOKAL"),
  ),
  { minLength: 0, maxLength: 10 },
);

describe("Property 11: Instrumental-Quellen-Auswahl", () => {
  it("gibt die INSTRUMENTAL-Quelle mit dem niedrigsten orderIndex zurück", () => {
    fc.assert(
      fc.property(audioQuellenMitInstrumental, (quellen) => {
        const result = findeInstrumentalQuelle(quellen);
        expect(result).not.toBeNull();

        // Verify it's INSTRUMENTAL
        expect(result!.rolle).toBe("INSTRUMENTAL");

        // Verify it has the lowest orderIndex among all INSTRUMENTAL sources
        const alleInstrumental = quellen.filter((q) => q.rolle === "INSTRUMENTAL");
        const minOrderIndex = Math.min(...alleInstrumental.map((q) => q.orderIndex));
        expect(result!.orderIndex).toBe(minOrderIndex);
      }),
      { numRuns: 100 },
    );
  });

  it("gibt null zurück wenn keine INSTRUMENTAL-Quelle vorhanden ist", () => {
    fc.assert(
      fc.property(audioQuellenOhneInstrumental, (quellen) => {
        const result = findeInstrumentalQuelle(quellen);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it("gibt null zurück für ein leeres Array", () => {
    expect(findeInstrumentalQuelle([])).toBeNull();
  });
});
