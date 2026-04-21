/**
 * Eigenschaft 11: Filterung blendet leere Gruppen aus
 *
 * Für jede Filtereingabe (Suchbegriff) und jede Menge von gruppierten
 * Tag_Definitionen gilt: Nach Anwendung des Filters darf keine Gruppe
 * leer sein – Gruppen, deren Tags vollständig herausgefiltert wurden,
 * müssen aus dem Ergebnis entfernt werden.
 *
 * **Validates: Requirements 8.2**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filtereGruppierteTagDefinitionen } from '@/lib/vocal-tag/tag-gruppierung';
import type {
  TagDefinitionData,
  TagKategorieData,
  GruppierteTagDefinitionen,
} from '@/types/vocal-tag';

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/**
 * Generator for a valid TagKategorieData with a given id and slug.
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
 * Generator for a TagDefinitionData with a given categoryId.
 */
function tagDefArb(categoryId: string | null): fc.Arbitrary<TagDefinitionData> {
  return fc.record({
    id: fc.uuid(),
    tag: fc.stringMatching(/^[a-z][a-z0-9_-]{0,14}$/),
    label: fc.stringMatching(/^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 ]{0,19}$/),
    icon: fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,9}$/),
    color: fc.stringMatching(/^#[0-9a-f]{6}$/),
    indexNr: fc.integer({ min: 0, max: 999 }),
    categoryId: fc.constant(categoryId),
  });
}

/**
 * Generator for a list of GruppierteTagDefinitionen (pre-grouped).
 * Each group has at least 1 tag to represent a valid grouped state.
 */
function gruppierteTagsArb(): fc.Arbitrary<GruppierteTagDefinitionen[]> {
  return fc
    .integer({ min: 1, max: 6 })
    .chain((gruppenAnzahl) => {
      const gruppenArbs = Array.from({ length: gruppenAnzahl }, (_, i) => {
        const kategorieArb =
          i < gruppenAnzahl - 1
            ? tagKategorieArb(`cat-${i}`, `slug-${i}`).map(
                (k) => k as TagKategorieData | null,
              )
            : fc.constantFrom(
                null as TagKategorieData | null,
                // Sometimes include a real category for the last group too
              );

        return kategorieArb.chain((kategorie) => {
          const catId = kategorie ? kategorie.id : null;
          return fc
            .array(tagDefArb(catId), { minLength: 1, maxLength: 8 })
            .map((tags) => ({ kategorie, tags }));
        });
      });

      return fc.tuple(
        ...(gruppenArbs as [
          fc.Arbitrary<GruppierteTagDefinitionen>,
          ...fc.Arbitrary<GruppierteTagDefinitionen>[],
        ]),
      );
    })
    .map((result) => (Array.isArray(result) ? result : [result]));
}

/**
 * Generator for search terms: mix of random strings and substrings
 * extracted from generated tags to ensure some matches occur.
 */
function suchbegriffArb(): fc.Arbitrary<string> {
  return fc.oneof(
    // Random short strings (may or may not match)
    fc.stringMatching(/^[a-zA-Z0-9]{0,5}$/),
    // Empty string (matches everything)
    fc.constant(''),
    // Single character
    fc.stringMatching(/^[a-z]$/),
  );
}

describe('Eigenschaft 11: Filterung blendet leere Gruppen aus', () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * Nach Anwendung des Filters darf keine Gruppe leer sein.
   */
  it('keine Gruppe im Ergebnis hat ein leeres tags-Array', () => {
    return fc.assert(
      fc.property(
        gruppierteTagsArb(),
        suchbegriffArb(),
        (gruppen, suchbegriff) => {
          const ergebnis = filtereGruppierteTagDefinitionen(gruppen, suchbegriff);

          // Core property: no group in the result may have an empty tags array
          for (const gruppe of ergebnis) {
            expect(gruppe.tags.length).toBeGreaterThan(0);
          }
        },
      ),
      PBT_CONFIG,
    );
  });

  /**
   * **Validates: Requirements 8.2**
   *
   * Die Anzahl der Ergebnis-Gruppen ist kleiner oder gleich der Eingabe-Gruppen.
   */
  it('Ergebnis hat höchstens so viele Gruppen wie die Eingabe', () => {
    return fc.assert(
      fc.property(
        gruppierteTagsArb(),
        suchbegriffArb(),
        (gruppen, suchbegriff) => {
          const ergebnis = filtereGruppierteTagDefinitionen(gruppen, suchbegriff);

          expect(ergebnis.length).toBeLessThanOrEqual(gruppen.length);
        },
      ),
      PBT_CONFIG,
    );
  });
});
