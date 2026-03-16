/**
 * Property 10: Weiter-Button ist nur bei abgeschlossener Zeile aktiv
 *
 * Für jeden Lernzustand soll der Weiter-Button genau dann aktiviert sein,
 * wenn der Status der aktiven Zeile „korrekt" oder „loesung" ist. In allen
 * anderen Zuständen (Status „eingabe") soll er deaktiviert sein.
 *
 * **Validates: Requirements 4.2, 3.5, 3.7**
 */
// Feature: line-by-line-learning, Property 10: Weiter-Button ist nur bei abgeschlossener Zeile aktiv

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/eingabe-bereich.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

// --- Pure function extracted from the EingabeBereich component ---

type ZeilenStatus = "eingabe" | "korrekt" | "loesung";

function isWeiterButtonDisabled(status: ZeilenStatus): boolean {
  return status === "eingabe";
}

// --- Arbitraries ---

const arbStatus = fc.constantFrom<ZeilenStatus>("eingabe", "korrekt", "loesung");

describe("Property 10: Weiter-Button ist nur bei abgeschlossener Zeile aktiv", () => {
  it("source contains disabled={status === 'eingabe'} on the Weiter button", () => {
    expect(source).toMatch(/disabled=\{status === "eingabe"\}/);
  });

  it("button is disabled when status is 'eingabe' (Req 4.2)", () => {
    fc.assert(
      fc.property(fc.constant("eingabe" as ZeilenStatus), (status) => {
        expect(isWeiterButtonDisabled(status)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("button is enabled when status is 'korrekt' (Req 3.5)", () => {
    fc.assert(
      fc.property(fc.constant("korrekt" as ZeilenStatus), (status) => {
        expect(isWeiterButtonDisabled(status)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("button is enabled when status is 'loesung' (Req 3.7)", () => {
    fc.assert(
      fc.property(fc.constant("loesung" as ZeilenStatus), (status) => {
        expect(isWeiterButtonDisabled(status)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("for any status, disabled === (status === 'eingabe')", () => {
    fc.assert(
      fc.property(arbStatus, (status) => {
        const disabled = isWeiterButtonDisabled(status);
        expect(disabled).toBe(status === "eingabe");
      }),
      { numRuns: 100 },
    );
  });
});
