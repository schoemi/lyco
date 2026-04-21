/**
 * Eigenschaft 9: Export/Import-Round-Trip
 *
 * Für jede Menge von Tag_Definitionen mit Kategorie-Zuordnungen gilt:
 * Das Ergebnis von Exportieren (Serialisierung zu JSON) und anschließendem
 * Importieren (Deserialisierung und Kategorie-Auflösung) muss äquivalente
 * Kategorie-Zuordnungen erzeugen – d.h. jede Tag_Definition muss nach dem
 * Round-Trip derselben Kategorie (identifiziert über den Slug) zugeordnet
 * sein wie zuvor.
 *
 * **Validates: Requirements 6.3**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  serializeTagConfig,
  validateTagConfigJson,
} from "@/lib/vocal-tag/tag-config-export";
import type { TagDefinitionData, TagKategorieData } from "@/types/vocal-tag";

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/**
 * Generator for a valid TagKategorieData object.
 */
function tagKategorieArb(): fc.Arbitrary<TagKategorieData> {
  return fc.record({
    id: fc.uuid(),
    title: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,14}$/),
    orderIndex: fc.integer({ min: 0, max: 999 }),
  });
}

/**
 * Generator for a TagDefinitionData WITH a category assigned.
 */
function tagDefWithCategoryArb(): fc.Arbitrary<TagDefinitionData> {
  return fc.record({
    id: fc.uuid(),
    tag: fc.stringMatching(/^[a-z][a-z0-9_-]{0,14}$/),
    label: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    icon: fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,9}$/),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    indexNr: fc.integer({ min: 0, max: 999 }),
    categoryId: fc.uuid(),
    category: tagKategorieArb(),
  });
}

/**
 * Generator for a TagDefinitionData WITHOUT a category.
 */
function tagDefWithoutCategoryArb(): fc.Arbitrary<TagDefinitionData> {
  return fc.record({
    id: fc.uuid(),
    tag: fc.stringMatching(/^[a-z][a-z0-9_-]{0,14}$/),
    label: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    icon: fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,9}$/),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    indexNr: fc.integer({ min: 0, max: 999 }),
    categoryId: fc.constant(null),
    category: fc.constant(undefined),
  });
}

/**
 * Generator for a list of tag definitions with unique tag identifiers.
 * Mixes tags with and without categories.
 */
function uniqueTagDefsArb(): fc.Arbitrary<TagDefinitionData[]> {
  return fc
    .array(
      fc.oneof(tagDefWithCategoryArb(), tagDefWithoutCategoryArb()),
      { minLength: 1, maxLength: 15 },
    )
    .map((defs) => {
      // Ensure unique tag identifiers by appending index
      const seen = new Set<string>();
      return defs.reduce<TagDefinitionData[]>((acc, def, i) => {
        let tag = def.tag;
        if (seen.has(tag)) {
          tag = `${tag}${i}`;
        }
        if (seen.has(tag)) return acc; // skip if still duplicate
        seen.add(tag);
        acc.push({ ...def, tag });
        return acc;
      }, []);
    })
    .filter((defs) => defs.length > 0);
}

describe("Eigenschaft 9: Export/Import-Round-Trip", () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * For every set of tag definitions with category assignments:
   * exporting (serialization to JSON) and then importing (deserialization
   * via validateTagConfigJson) must produce equivalent category assignments –
   * i.e. each tag must be assigned to the same category slug after the round-trip.
   */
  it("Export→Import bewahrt Kategorie-Slugs für alle Tags", () => {
    return fc.assert(
      fc.property(uniqueTagDefsArb(), (tagDefs) => {
        // Step 1: Export – serialize to JSON
        const json = serializeTagConfig(tagDefs);

        // Step 2: Import – parse and validate
        const result = validateTagConfigJson(json);

        // Validation must succeed
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.definitions).toHaveLength(tagDefs.length);

        // Step 3: Verify category slug preservation
        for (let i = 0; i < tagDefs.length; i++) {
          const original = tagDefs[i];
          const imported = result.definitions[i];

          // Tag identifier must match
          expect(imported.tag).toBe(original.tag);

          if (original.category) {
            // Tag with category → imported item must have the same slug
            expect(imported.category).toBe(original.category.slug);
          } else {
            // Tag without category → imported item must not have a category
            expect(imported.category).toBeUndefined();
          }
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 6.3**
   *
   * All tags with categories preserve their slug, and all tags without
   * categories remain without a category after the round-trip.
   * This test focuses on only-with-category tags.
   */
  it("Export→Import bewahrt Kategorie-Slug für Tags mit Kategorie", () => {
    return fc.assert(
      fc.property(
        fc
          .array(tagDefWithCategoryArb(), { minLength: 1, maxLength: 10 })
          .map((defs) => {
            const seen = new Set<string>();
            return defs.reduce<TagDefinitionData[]>((acc, def, i) => {
              let tag = def.tag;
              if (seen.has(tag)) tag = `${tag}${i}`;
              if (seen.has(tag)) return acc;
              seen.add(tag);
              acc.push({ ...def, tag });
              return acc;
            }, []);
          })
          .filter((defs) => defs.length > 0),
        (tagDefs) => {
          const json = serializeTagConfig(tagDefs);
          const result = validateTagConfigJson(json);

          expect(result.valid).toBe(true);
          expect(result.definitions).toHaveLength(tagDefs.length);

          for (let i = 0; i < tagDefs.length; i++) {
            const original = tagDefs[i];
            const imported = result.definitions[i];

            // Every tag must have a category slug after round-trip
            expect(imported.category).toBeDefined();
            expect(imported.category).toBe(original.category!.slug);
          }
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 6.3**
   *
   * Tags without categories remain without a category after the round-trip.
   */
  it("Export→Import: Tags ohne Kategorie bleiben ohne Kategorie", () => {
    return fc.assert(
      fc.property(
        fc
          .array(tagDefWithoutCategoryArb(), { minLength: 1, maxLength: 10 })
          .map((defs) => {
            const seen = new Set<string>();
            return defs.reduce<TagDefinitionData[]>((acc, def, i) => {
              let tag = def.tag;
              if (seen.has(tag)) tag = `${tag}${i}`;
              if (seen.has(tag)) return acc;
              seen.add(tag);
              acc.push({ ...def, tag });
              return acc;
            }, []);
          })
          .filter((defs) => defs.length > 0),
        (tagDefs) => {
          const json = serializeTagConfig(tagDefs);
          const result = validateTagConfigJson(json);

          expect(result.valid).toBe(true);
          expect(result.definitions).toHaveLength(tagDefs.length);

          for (const imported of result.definitions) {
            // No tag should have a category after round-trip
            expect(imported.category).toBeUndefined();
          }
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 6.3**
   *
   * The round-trip preserves all core fields (tag, label, icon, color, indexNr)
   * in addition to the category slug.
   */
  it("Export→Import bewahrt alle Kernfelder neben dem Kategorie-Slug", () => {
    return fc.assert(
      fc.property(uniqueTagDefsArb(), (tagDefs) => {
        const json = serializeTagConfig(tagDefs);
        const result = validateTagConfigJson(json);

        expect(result.valid).toBe(true);
        expect(result.definitions).toHaveLength(tagDefs.length);

        for (let i = 0; i < tagDefs.length; i++) {
          const original = tagDefs[i];
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
