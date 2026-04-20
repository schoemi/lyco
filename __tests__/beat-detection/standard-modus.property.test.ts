/**
 * Property 1: Standard-Modus basiert auf Instrumental-Verfügbarkeit
 *
 * Für jedes Array von AudioQuellen gilt: Wenn mindestens eine AudioQuelle
 * mit Rolle INSTRUMENTAL vorhanden ist, soll der Standard-Modus AUTOMATISCH sein;
 * andernfalls soll der Standard-Modus MANUELL sein.
 *
 * **Validates: Requirements 1.2, 1.3**
 *
 * Feature: beat-detection, Property 1: Standard-Modus basiert auf Instrumental-Verfügbarkeit
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { berechneStandardModus } from "@/lib/beat-detection/beat-utils";
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

// Generator: Array of AudioQuellen with random roles
const audioQuellenOhneInstrumental = fc.array(
  fc.oneof(
    audioQuelleArb("STANDARD"),
    audioQuelleArb("REFERENZ_VOKAL"),
  ),
  { minLength: 0, maxLength: 10 },
);

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

describe("Property 1: Standard-Modus basiert auf Instrumental-Verfügbarkeit", () => {
  it("gibt MANUELL zurück wenn keine INSTRUMENTAL-Quelle vorhanden ist", () => {
    fc.assert(
      fc.property(audioQuellenOhneInstrumental, (quellen) => {
        const modus = berechneStandardModus(quellen);
        expect(modus).toBe("MANUELL");
      }),
      { numRuns: 100 },
    );
  });

  it("gibt AUTOMATISCH zurück wenn mindestens eine INSTRUMENTAL-Quelle vorhanden ist", () => {
    fc.assert(
      fc.property(audioQuellenMitInstrumental, (quellen) => {
        const modus = berechneStandardModus(quellen);
        expect(modus).toBe("AUTOMATISCH");
      }),
      { numRuns: 100 },
    );
  });

  it("gibt MANUELL zurück für ein leeres Array", () => {
    expect(berechneStandardModus([])).toBe("MANUELL");
  });
});
