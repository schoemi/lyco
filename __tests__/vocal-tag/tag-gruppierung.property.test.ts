/**
 * Eigenschaft 10: Gruppierungsfunktion
 *
 * Für jede Menge von Tag_Definitionen und Tag_Kategorien gilt:
 * 1. Jede Tag_Definition erscheint in genau einer Gruppe.
 * 2. Die Gruppen sind nach dem orderIndex der zugehörigen Kategorie sortiert.
 * 3. Tags ohne Kategorie-Zuordnung erscheinen in der letzten Gruppe.
 * 4. Die Gesamtanzahl der Tags über alle Gruppen entspricht der Eingabe-Anzahl.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.3**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { gruppiereTagsNachKategorie } from '@/lib/vocal-tag/tag-gruppierung';
import type { TagDefinitionData, TagKategorieData } from '@/types/vocal-tag';

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/**
 * Generator for a valid TagKategorieData with a given id and unique slug.
 */
function tagKategorieArb(id: string, slug: string): fc.Arbitrary<TagKategorieData> {
  return fc.record({
    id: fc.constant(id),
    title: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    slug: fc.constant(slug),
    orderIndex: fc.integer({ min: 0, max: 999 }),
  });
}

/**
 * Generator for a set of categories with unique ids and slugs.
 */
function kategorienArb(): fc.Arbitrary<TagKategorieData[]> {
  return fc
    .integer({ min: 0, max: 8 })
    .chain((count) => {
      if (count === 0) return fc.constant([]);
      const arbs = Array.from({ length: count }, (_, i) =>
        tagKategorieArb(`cat-${i}`, `slug-${i}`).map((k) => ({
          ...k,
          orderIndex: k.orderIndex,
        })),
      );
      return fc.tuple(...(arbs as [fc.Arbitrary<TagKategorieData>, ...fc.Arbitrary<TagKategorieData>[]]));
    })
    .map((result) => (Array.isArray(result) ? result : [result]));
}

/**
 * Generator for a TagDefinitionData that may or may not have a category.
 * categoryId is picked from the provided category ids or null.
 */
function tagDefArb(categoryIds: (string | null)[]): fc.Arbitrary<TagDefinitionData> {
  const catIdArb =
    categoryIds.length > 0
      ? fc.constantFrom(...categoryIds)
      : fc.constant(null);

  return fc.record({
    id: fc.uuid(),
    tag: fc.stringMatching(/^[a-z][a-z0-9_-]{0,14}$/),
    label: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    icon: fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,9}$/),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    indexNr: fc.integer({ min: 0, max: 999 }),
    categoryId: catIdArb,
  });
}

/**
 * Generator for a combined test scenario: categories + tags referencing them.
 */
function scenarioArb(): fc.Arbitrary<{
  kategorien: TagKategorieData[];
  tags: TagDefinitionData[];
}> {
  return kategorienArb().chain((kategorien) => {
    const categoryIds: (string | null)[] = [
      ...kategorien.map((k) => k.id),
      null,
    ];
    return fc
      .array(tagDefArb(categoryIds), { minLength: 0, maxLength: 20 })
      .map((tags) => ({ kategorien, tags }));
  });
}

describe('Eigenschaft 10: Gruppierungsfunktion', () => {
  /**
   * **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.3**
   *
   * Jede Tag_Definition erscheint in genau einer Gruppe.
   */
  it('jede Tag-Definition erscheint in genau einer Gruppe', () => {
    return fc.assert(
      fc.property(scenarioArb(), ({ kategorien, tags }) => {
        const gruppen = gruppiereTagsNachKategorie(tags, kategorien);

        // Collect all tag ids from all groups
        const alleTagIds = gruppen.flatMap((g) => g.tags.map((t) => t.id));

        // Each tag from input must appear exactly once
        for (const tag of tags) {
          const count = alleTagIds.filter((id) => id === tag.id).length;
          expect(count).toBe(1);
        }

        // No extra tags in the output
        expect(alleTagIds.length).toBe(tags.length);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.3**
   *
   * Die Gruppen sind nach dem orderIndex der zugehörigen Kategorie sortiert.
   */
  it('Gruppen sind nach orderIndex der Kategorie sortiert', () => {
    return fc.assert(
      fc.property(scenarioArb(), ({ kategorien, tags }) => {
        const gruppen = gruppiereTagsNachKategorie(tags, kategorien);

        // Filter groups that have a category (non-null)
        const gruppenMitKategorie = gruppen.filter((g) => g.kategorie !== null);

        // Verify ascending orderIndex for consecutive category groups
        for (let i = 1; i < gruppenMitKategorie.length; i++) {
          expect(gruppenMitKategorie[i].kategorie!.orderIndex).toBeGreaterThanOrEqual(
            gruppenMitKategorie[i - 1].kategorie!.orderIndex,
          );
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.3**
   *
   * Tags ohne Kategorie-Zuordnung erscheinen in der letzten Gruppe.
   */
  it('Tags ohne Kategorie erscheinen in der letzten Gruppe', () => {
    return fc.assert(
      fc.property(scenarioArb(), ({ kategorien, tags }) => {
        const gruppen = gruppiereTagsNachKategorie(tags, kategorien);

        const tagsOhneKategorie = tags.filter((t) => t.categoryId === null);

        if (tagsOhneKategorie.length > 0) {
          // The last group must be the one with kategorie: null
          const letzteGruppe = gruppen[gruppen.length - 1];
          expect(letzteGruppe.kategorie).toBeNull();

          // All uncategorized tags must be in this last group
          const letzteGruppeIds = new Set(letzteGruppe.tags.map((t) => t.id));
          for (const tag of tagsOhneKategorie) {
            expect(letzteGruppeIds.has(tag.id)).toBe(true);
          }
        }

        // No group with kategorie: null should appear before the last position
        const nullGruppenIndizes = gruppen
          .map((g, i) => (g.kategorie === null ? i : -1))
          .filter((i) => i >= 0);

        if (nullGruppenIndizes.length > 0) {
          expect(nullGruppenIndizes).toHaveLength(1);
          expect(nullGruppenIndizes[0]).toBe(gruppen.length - 1);
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.2, 7.3, 8.1, 8.3**
   *
   * Die Gesamtanzahl der Tags über alle Gruppen entspricht der Eingabe-Anzahl.
   */
  it('Gesamtanzahl der Tags über alle Gruppen entspricht der Eingabe-Anzahl', () => {
    return fc.assert(
      fc.property(scenarioArb(), ({ kategorien, tags }) => {
        const gruppen = gruppiereTagsNachKategorie(tags, kategorien);

        const gesamtanzahl = gruppen.reduce((sum, g) => sum + g.tags.length, 0);
        expect(gesamtanzahl).toBe(tags.length);
      }),
      PBT_CONFIG,
    );
  });
});
