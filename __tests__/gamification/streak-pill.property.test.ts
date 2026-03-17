/**
 * @vitest-environment jsdom
 */
// Feature: gamification-progress, Property 2: Streak-Anzeige-Text ist korrekt formatiert

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, screen } from "@testing-library/react";
import { StreakPill } from "@/components/gamification/streak-pill";

/**
 * Property 2: Streak-Anzeige-Text ist korrekt formatiert
 *
 * Für jeden Streak-Wert >= 1 rendert die StreakPill-Komponente einen Text,
 * der den Streak-Wert enthält. Bei Streak = 1 wird "1 Tag Streak" angezeigt,
 * bei Streak > 1 wird "N Tage Streak" angezeigt.
 * Bei Streak = 0 wird die Komponente nicht gerendert (null).
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */

const PBT_CONFIG = { numRuns: 100 };

describe("Property 2: Streak-Anzeige-Text ist korrekt formatiert", () => {
  it("streak === 0 → component returns null (not rendered)", () => {
    fc.assert(
      fc.property(fc.constant(0), (streak) => {
        const { container } = render(React.createElement(StreakPill, { streak }));
        expect(container.innerHTML).toBe("");
      }),
      PBT_CONFIG,
    );
  });

  it('streak === 1 → rendered text contains "1 Tag Streak"', () => {
    fc.assert(
      fc.property(fc.constant(1), (streak) => {
        const { container } = render(React.createElement(StreakPill, { streak }));
        expect(container.textContent).toContain("1 Tag Streak");
        expect(container.textContent).not.toContain("Tage");
      }),
      PBT_CONFIG,
    );
  });

  it('streak > 1 → rendered text contains "N Tage Streak"', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10000 }), (streak) => {
        const { container } = render(React.createElement(StreakPill, { streak }));
        expect(container.textContent).toContain(`${streak} Tage Streak`);
      }),
      PBT_CONFIG,
    );
  });

  it("streak >= 1 → component is rendered (not null)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (streak) => {
        const { container } = render(React.createElement(StreakPill, { streak }));
        expect(container.innerHTML).not.toBe("");
      }),
      PBT_CONFIG,
    );
  });

  it("streak >= 1 → rendered text contains the streak number", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (streak) => {
        const { container } = render(React.createElement(StreakPill, { streak }));
        expect(container.textContent).toContain(String(streak));
      }),
      PBT_CONFIG,
    );
  });
});
