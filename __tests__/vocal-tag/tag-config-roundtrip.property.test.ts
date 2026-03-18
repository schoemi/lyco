/**
 * Property 7: Tag-Konfigurations-Export-Import Round-Trip
 *
 * For any set of TagDefinitions, exporting them as JSON and then importing
 * the resulting JSON shall produce an identical set of TagDefinitions
 * (same `tag`, `label`, `icon`, `color`, `indexNr` values).
 *
 * **Validates: Requirements 15.1, 15.2**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { serializeTagConfig, validateTagConfigJson } from "@/lib/vocal-tag/tag-config-export";
import type { TagDefinitionData } from "@/types/vocal-tag";

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/** Unique tag name: lowercase alpha start, then alphanumeric, 1-12 chars */
const tagNameArb = fc.stringMatching(/^[a-z][a-z0-9]{0,11}$/);

/** Label: non-empty string with word chars, spaces, umlauts */
const labelArb = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß][a-zA-ZäöüÄÖÜß0-9 ]{0,29}$/);

/** FontAwesome icon class */
const iconArb = fc
  .tuple(
    fc.constantFrom("fa-solid", "fa-regular", "fa-light"),
    fc.stringMatching(/^[a-z][a-z-]{1,15}$/),
  )
  .map(([prefix, name]) => `${prefix} fa-${name}`);

/** Hex color code */
const colorArb = fc.stringMatching(/^#[0-9a-fA-F]{6}$/).filter((c) => c.length === 7);

/** Index number: positive integer */
const indexNrArb = fc.integer({ min: 0, max: 999 });

/** A single TagDefinitionData with a generated cuid-like id */
const tagDefinitionArb = fc
  .tuple(fc.uuid(), tagNameArb, labelArb, iconArb, colorArb, indexNrArb)
  .map(([id, tag, label, icon, color, indexNr]): TagDefinitionData => ({
    id,
    tag,
    label,
    icon,
    color,
    indexNr,
  }));

/**
 * Array of TagDefinitionData with unique `tag` values (1-10 items).
 * Uses uniqueArray to ensure no duplicate tag names.
 */
const tagDefinitionsArb = fc
  .uniqueArray(tagDefinitionArb, {
    minLength: 1,
    maxLength: 10,
    selector: (def) => def.tag,
  });

describe("Property 7: Tag-Konfigurations-Export-Import Round-Trip", () => {
  /**
   * **Validates: Requirements 15.1, 15.2**
   *
   * Für jede Menge von Tag-Definitionen: Export → Import ergibt identische Definitionen
   */
  it("serializeTagConfig → validateTagConfigJson ergibt identische Definitionen (ohne id)", () => {
    return fc.assert(
      fc.property(tagDefinitionsArb, (definitions) => {
        // Export: serialize to JSON
        const json = serializeTagConfig(definitions);

        // Import: validate and parse JSON
        const result = validateTagConfigJson(json);

        // Validation must succeed
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Number of imported definitions must match
        expect(result.definitions).toHaveLength(definitions.length);

        // Each imported definition must match the original (minus id)
        for (let i = 0; i < definitions.length; i++) {
          const original = definitions[i];
          const imported = result.definitions[i];

          expect(imported.tag).toBe(original.tag);
          expect(imported.label).toBe(original.label);
          expect(imported.icon).toBe(original.icon);
          expect(imported.color).toBe(original.color);
          expect(imported.indexNr).toBe(original.indexNr);
        }
      }),
      PBT_CONFIG,
    );
  });
});
