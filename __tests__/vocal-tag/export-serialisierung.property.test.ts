/**
 * Eigenschaft 8: Export-Serialisierung
 *
 * Für jede Tag_Definition gilt: Wenn sie einer Kategorie zugeordnet ist,
 * muss das exportierte JSON-Objekt ein category-Feld mit dem Slug der
 * Kategorie enthalten. Wenn sie keiner Kategorie zugeordnet ist, darf
 * das exportierte JSON-Objekt kein category-Feld enthalten.
 *
 * **Validates: Requirements 6.1, 6.2**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { serializeTagConfig } from "@/lib/vocal-tag/tag-config-export";
import type { TagDefinitionData, TagKategorieData } from "@/types/vocal-tag";

const PBT_CONFIG = { numRuns: 100 };

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

describe("Eigenschaft 8: Export-Serialisierung", () => {
  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Tags with a category must include `category: slug` in the exported JSON.
   */
  it("Tag mit Kategorie enthält category-Feld mit Slug im Export", () => {
    return fc.assert(
      fc.property(tagDefWithCategoryArb(), (tagDef) => {
        const json = serializeTagConfig([tagDef]);
        const parsed = JSON.parse(json) as Record<string, unknown>[];

        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toHaveProperty("category");
        expect(parsed[0].category).toBe(tagDef.category!.slug);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Tags without a category must NOT include a `category` field in the exported JSON.
   */
  it("Tag ohne Kategorie enthält kein category-Feld im Export", () => {
    return fc.assert(
      fc.property(tagDefWithoutCategoryArb(), (tagDef) => {
        const json = serializeTagConfig([tagDef]);
        const parsed = JSON.parse(json) as Record<string, unknown>[];

        expect(parsed).toHaveLength(1);
        expect(parsed[0]).not.toHaveProperty("category");
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * Mixed list: each tag's export entry correctly includes or omits the category field.
   */
  it("gemischte Liste: category-Feld korrekt pro Tag gesetzt oder weggelassen", () => {
    return fc.assert(
      fc.property(
        fc.array(
          fc.oneof(tagDefWithCategoryArb(), tagDefWithoutCategoryArb()),
          { minLength: 1, maxLength: 20 },
        ),
        (tagDefs) => {
          const json = serializeTagConfig(tagDefs);
          const parsed = JSON.parse(json) as Record<string, unknown>[];

          expect(parsed).toHaveLength(tagDefs.length);

          for (let i = 0; i < tagDefs.length; i++) {
            const def = tagDefs[i];
            const exported = parsed[i];

            if (def.category) {
              expect(exported).toHaveProperty("category");
              expect(exported.category).toBe(def.category.slug);
            } else {
              expect(exported).not.toHaveProperty("category");
            }
          }
        },
      ),
      PBT_CONFIG,
    );
  });
});
