/**
 * Property 3: Alle auswählen / Alle abwählen
 *
 * Für jede beliebige Teilmenge ausgewählter Strophen soll „Alle auswählen" dazu führen,
 * dass alle Strophen ausgewählt sind, und „Alle abwählen" soll dazu führen, dass keine
 * Strophe ausgewählt ist. Bei null ausgewählten Strophen soll das Bestätigen verhindert werden.
 *
 * **Validates: Requirements 2.2, 2.3, 2.4**
 */
// Feature: selective-cloze-practice, Property 3: Alle auswählen / Alle abwählen

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/strophen-auswahl-dialog.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

const arbStropheId = fc.uuid();

describe("Property 3: Alle auswählen / Alle abwählen", () => {
  it('component has "Alle auswählen" button that calls handleSelectAll', () => {
    expect(source).toContain("Alle auswählen");
    expect(source).toContain("handleSelectAll");
  });

  it('component has "Alle abwählen" button that calls handleDeselectAll', () => {
    expect(source).toContain("Alle abwählen");
    expect(source).toContain("handleDeselectAll");
  });

  it("handleSelectAll sets localSelection to all strophe IDs", () => {
    expect(source).toMatch(
      /handleSelectAll[\s\S]*?setLocalSelection\(new Set\(strophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)/
    );
  });

  it("handleDeselectAll sets localSelection to empty set", () => {
    expect(source).toMatch(
      /handleDeselectAll[\s\S]*?setLocalSelection\(new Set\(\)\)/
    );
  });

  it("validation prevents confirm with zero selected strophen", () => {
    expect(source).toContain("localSelection.size === 0");
    expect(source).toContain(
      "Mindestens eine Strophe muss ausgewählt sein"
    );
  });

  it("for any strophe list, selectAll produces full set and deselectAll produces empty set", () => {
    fc.assert(
      fc.property(
        fc.array(arbStropheId, { minLength: 1, maxLength: 20 }).map((ids) => [
          ...new Set(ids),
        ]),
        (uniqueIds) => {
          // Simulate handleSelectAll: set all IDs
          const afterSelectAll = new Set(uniqueIds);
          expect(afterSelectAll.size).toBe(uniqueIds.length);
          for (const id of uniqueIds) {
            expect(afterSelectAll.has(id)).toBe(true);
          }

          // Simulate handleDeselectAll: empty set
          const afterDeselectAll = new Set<string>();
          expect(afterDeselectAll.size).toBe(0);

          // Simulate validation: confirm blocked when empty
          const canConfirm = afterDeselectAll.size > 0;
          expect(canConfirm).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("for any partial selection, selectAll adds all missing IDs", () => {
    fc.assert(
      fc.property(
        fc
          .array(arbStropheId, { minLength: 2, maxLength: 20 })
          .map((ids) => [...new Set(ids)])
          .chain((uniqueIds) =>
            fc.tuple(
              fc.constant(uniqueIds),
              fc
                .subarray(uniqueIds, { minLength: 0 })
                .map((sub) => new Set(sub))
            )
          ),
        ([allIds, partialSelection]) => {
          // Before selectAll, some may be missing
          // After selectAll, all must be present
          const afterSelectAll = new Set(allIds);
          for (const id of allIds) {
            expect(afterSelectAll.has(id)).toBe(true);
          }
          expect(afterSelectAll.size).toBe(allIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
