/**
 * Eigenschaft 7: Import-Kategorie-Auflösung
 *
 * Für jede importierte Tag_Definition gilt:
 * - Wenn das category-Feld einem existierenden Kategorie-Slug entspricht,
 *   muss die Tag_Definition dieser Kategorie zugeordnet werden.
 * - Wenn das category-Feld einem nicht-existierenden Slug entspricht,
 *   muss eine neue Kategorie mit diesem Slug erstellt und die Tag_Definition
 *   zugeordnet werden.
 * - Wenn kein category-Feld vorhanden ist, muss categoryId null sein.
 *
 * **Validates: Requirements 5.2, 5.3, 5.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

const PBT_CONFIG = { numRuns: 100 };

// --- Mocks ---

const mockFindBySlug = vi.fn();
const mockCreateKategorie = vi.fn();

vi.mock("@/lib/services/tag-kategorie-service", () => ({
  findTagKategorieBySlug: (...args: unknown[]) => mockFindBySlug(...args),
  createTagKategorie: (...args: unknown[]) => mockCreateKategorie(...args),
}));

import {
  resolveImportCategories,
  type TagConfigImportItem,
} from "@/lib/vocal-tag/resolve-import-categories";

// --- Generators ---

/** Generator for a valid tag identifier */
const tagArb = fc.stringMatching(/^[a-z][a-z0-9_-]{0,14}$/);

/** Generator for a valid slug */
const slugArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/).filter((s) => !s.endsWith("-"));

/** Generator for a valid base import item without category */
function baseImportItemArb(): fc.Arbitrary<TagConfigImportItem> {
  return fc.record({
    tag: tagArb,
    label: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    icon: fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,9}$/),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    indexNr: fc.integer({ min: 0, max: 999 }),
  });
}

/** Generator for a cuid-like ID */
const cuidArb = fc.stringMatching(/^c[a-z0-9]{24}$/);

describe("Eigenschaft 7: Import-Kategorie-Auflösung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 5.2**
   *
   * When the category field matches an existing slug, the tag must be
   * assigned to that existing category's ID.
   */
  it("existierender Slug → Tag wird der bestehenden Kategorie zugeordnet", () => {
    return fc.assert(
      fc.asyncProperty(
        baseImportItemArb(),
        slugArb,
        cuidArb,
        async (baseItem, slug, existingId) => {
          vi.clearAllMocks();

          const item: TagConfigImportItem = { ...baseItem, category: slug };

          mockFindBySlug.mockResolvedValue({
            id: existingId,
            title: slug,
            slug,
            orderIndex: 0,
          });

          const result = await resolveImportCategories([item]);

          // Must map to the existing category's ID
          expect(result.get(item.tag)).toBe(existingId);

          // findTagKategorieBySlug must have been called with the slug
          expect(mockFindBySlug).toHaveBeenCalledWith(slug);

          // createTagKategorie must NOT have been called
          expect(mockCreateKategorie).not.toHaveBeenCalled();
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * When the category field contains a slug that does not exist,
   * a new category must be created with that slug as title, and the
   * tag must be assigned to the newly created category's ID.
   */
  it("nicht-existierender Slug → neue Kategorie wird erstellt und zugeordnet", () => {
    return fc.assert(
      fc.asyncProperty(
        baseImportItemArb(),
        slugArb,
        cuidArb,
        async (baseItem, slug, newId) => {
          vi.clearAllMocks();

          const item: TagConfigImportItem = { ...baseItem, category: slug };

          // Slug does not exist
          mockFindBySlug.mockResolvedValue(null);

          // Creation returns a new category
          mockCreateKategorie.mockResolvedValue({
            id: newId,
            title: slug,
            slug,
            orderIndex: 0,
          });

          const result = await resolveImportCategories([item]);

          // Must map to the newly created category's ID
          expect(result.get(item.tag)).toBe(newId);

          // findTagKategorieBySlug must have been called
          expect(mockFindBySlug).toHaveBeenCalledWith(slug);

          // createTagKategorie must have been called with slug as title
          expect(mockCreateKategorie).toHaveBeenCalledWith({
            title: slug,
            slug,
          });
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * When no category field is present, categoryId must be null.
   */
  it("fehlendes category-Feld → categoryId ist null", () => {
    return fc.assert(
      fc.asyncProperty(baseImportItemArb(), async (baseItem) => {
        vi.clearAllMocks();

        // No category field on the item
        const item: TagConfigImportItem = { ...baseItem };
        delete item.category;

        const result = await resolveImportCategories([item]);

        // Must map to null
        expect(result.get(item.tag)).toBeNull();

        // Neither lookup nor creation should have been called
        expect(mockFindBySlug).not.toHaveBeenCalled();
        expect(mockCreateKategorie).not.toHaveBeenCalled();
      }),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 5.2, 5.3, 5.4**
   *
   * Mixed batch: items with existing slugs, new slugs, and no category
   * must all be resolved correctly in a single call.
   */
  it("gemischte Batch-Auflösung: existierend, neu und ohne Kategorie", () => {
    return fc.assert(
      fc.asyncProperty(
        // Three distinct tags
        fc.tuple(tagArb, tagArb, tagArb).filter(
          ([a, b, c]) => a !== b && b !== c && a !== c,
        ),
        // Two distinct slugs
        fc.tuple(slugArb, slugArb).filter(([a, b]) => a !== b),
        // Two distinct IDs
        fc.tuple(cuidArb, cuidArb).filter(([a, b]) => a !== b),
        async ([tag1, tag2, tag3], [existingSlug, newSlug], [existingId, newId]) => {
          vi.clearAllMocks();

          const itemExisting: TagConfigImportItem = {
            tag: tag1,
            label: "Label1",
            icon: "icon1",
            color: "#aabbcc",
            indexNr: 1,
            category: existingSlug,
          };

          const itemNew: TagConfigImportItem = {
            tag: tag2,
            label: "Label2",
            icon: "icon2",
            color: "#ddeeff",
            indexNr: 2,
            category: newSlug,
          };

          const itemNone: TagConfigImportItem = {
            tag: tag3,
            label: "Label3",
            icon: "icon3",
            color: "#112233",
            indexNr: 3,
            // no category
          };

          // existingSlug → found, newSlug → not found
          mockFindBySlug.mockImplementation(async (slug: string) => {
            if (slug === existingSlug) {
              return { id: existingId, title: existingSlug, slug: existingSlug, orderIndex: 0 };
            }
            return null;
          });

          mockCreateKategorie.mockResolvedValue({
            id: newId,
            title: newSlug,
            slug: newSlug,
            orderIndex: 0,
          });

          const result = await resolveImportCategories([itemExisting, itemNew, itemNone]);

          // Existing slug → existing ID
          expect(result.get(tag1)).toBe(existingId);

          // New slug → newly created ID
          expect(result.get(tag2)).toBe(newId);

          // No category → null
          expect(result.get(tag3)).toBeNull();

          // All three tags must be in the result map
          expect(result.size).toBe(3);
        },
      ),
      PBT_CONFIG,
    );
  });
});
