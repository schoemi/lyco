/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import React from "react";
import { render } from "@testing-library/react";
import StatusBadge from "@/components/admin/status-badge";
import type { AccountStatus } from "@/types/auth";

/**
 * Feature: user-account-control
 * Property 12: StatusBadge-Rendering
 *
 * Für jeden gültigen accountStatus-Wert muss die StatusBadge-Komponente
 * die korrekte Farb-CSS-Klasse und den korrekten deutschen Labeltext rendern.
 *
 * **Validates: Requirements 2.4**
 */

const expectedMappings: Record<AccountStatus, { classes: string[]; label: string }> = {
  ACTIVE: { classes: ["bg-green-100", "text-green-800"], label: "Aktiv" },
  SUSPENDED: { classes: ["bg-red-100", "text-red-800"], label: "Gesperrt" },
  PENDING: { classes: ["bg-yellow-100", "text-yellow-800"], label: "Ausstehend" },
};

const PBT_CONFIG = { numRuns: 100 };

describe("Property 12: StatusBadge-Rendering", () => {
  it("renders the correct CSS color classes and German label for every valid accountStatus", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AccountStatus>("ACTIVE", "SUSPENDED", "PENDING"),
        (status) => {
          const { container } = render(React.createElement(StatusBadge, { status }));
          const badge = container.querySelector("span")!;

          const expected = expectedMappings[status];

          // Verify the correct German label text
          expect(badge.textContent).toBe(expected.label);

          // Verify the correct CSS color classes are present
          for (const cls of expected.classes) {
            expect(badge.className).toContain(cls);
          }
        }
      ),
      PBT_CONFIG
    );
  });
});
