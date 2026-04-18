/**
 * Bug Condition Exploration Test — Missing Editor Icons
 *
 * **Validates: Requirements 1.1, 2.1, 2.2, 2.3**
 *
 * Bug Condition: isBugCondition(input) where
 *   input.colorProp IS undefined AND input.cssVarResolved IS false
 *
 * These tests assert the EXPECTED (fixed) behavior: AppIcon should render with
 * `var(--color-icon, currentColor)` as the inline style color when no explicit
 * color prop is provided. On UNFIXED code, these tests will FAIL because the
 * component only uses `var(--color-icon)` without a currentColor fallback.
 *
 * Failure confirms the bug exists.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, cleanup } from "@testing-library/react";

// Mock @iconify/react so the Icon component renders a real DOM element with
// all props applied. The real Iconify Icon renders as an empty <span> in jsdom
// because it cannot load SVG icon data. This mock lets us verify the props
// that AppIcon computes and passes through.
vi.mock("@iconify/react", () => ({
  Icon: (props: Record<string, unknown>) => {
    const { icon, ...rest } = props;
    return React.createElement("svg", { "data-icon": icon, ...rest });
  },
}));

// Import AFTER mock is set up
import { AppIcon } from "@/components/ui/iconify-icon";
import fs from "fs";
import path from "path";

afterEach(() => {
  cleanup();
  // Ensure --color-icon is NOT set between tests
  document.documentElement.style.removeProperty("--color-icon");
});

/**
 * Generator for random Iconify icon names in the lucide set.
 */
const iconNameArb = fc.constantFrom(
  "lucide:music",
  "lucide:pencil",
  "lucide:trash-2",
  "lucide:message-square",
  "lucide:search",
  "lucide:settings",
  "lucide:heart",
  "lucide:star",
  "lucide:play",
  "lucide:pause",
  "lucide:volume-2",
  "lucide:mic",
  "lucide:file-text",
  "lucide:download",
  "lucide:upload"
);

describe("Bug Condition: Icons Invisible Without CSS Variable Fallback", () => {
  /**
   * Test 1a: Render AppIcon without --color-icon set on document.
   * Assert the inline style contains `var(--color-icon, currentColor)` as fallback.
   * Will FAIL on unfixed code because it only has `var(--color-icon)`.
   */
  it("1a: AppIcon inline style includes currentColor fallback when --color-icon is not set", () => {
    // Ensure --color-icon is NOT set
    document.documentElement.style.removeProperty("--color-icon");

    fc.assert(
      fc.property(iconNameArb, (iconName) => {
        const { container } = render(
          React.createElement(AppIcon, { icon: iconName })
        );

        const styledElement = container.firstElementChild;
        expect(styledElement).not.toBeNull();

        const inlineStyle = styledElement!.getAttribute("style") ?? "";

        // The expected fixed behavior: style should contain currentColor as CSS fallback
        expect(inlineStyle).toContain("var(--color-icon, currentColor)");

        cleanup();
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Test 1b: Generate random Iconify icon names and verify each renders with
   * currentColor fallback when no color prop is provided.
   * Will FAIL on unfixed code.
   */
  it("1b: random icon names render with currentColor fallback without color prop", () => {
    document.documentElement.style.removeProperty("--color-icon");

    fc.assert(
      fc.property(iconNameArb, (iconName) => {
        const { container } = render(
          React.createElement(AppIcon, { icon: iconName })
        );

        const styledElement = container.firstElementChild;
        expect(styledElement).not.toBeNull();

        const styleAttr = styledElement!.getAttribute("style") ?? "";

        // Must include currentColor as the CSS variable fallback
        expect(styleAttr).toMatch(/var\(--color-icon,\s*currentColor\)/);

        cleanup();
      }),
      { numRuns: 15 }
    );
  });

  /**
   * Test 1c: Source-code analysis — read the AppIcon source file and verify
   * the inline style expression contains `currentColor` as a CSS fallback value.
   * Will FAIL on unfixed code because the source only has `var(--color-icon)`.
   */
  it("1c: source code of AppIcon contains currentColor as CSS fallback", () => {
    const sourcePath = path.resolve(
      process.cwd(),
      "src/components/ui/iconify-icon.tsx"
    );
    const source = fs.readFileSync(sourcePath, "utf-8");

    // The source should contain a var() expression with currentColor fallback
    // Expected pattern: var(--color-icon, currentColor)
    expect(source).toMatch(/var\(--color-icon,\s*currentColor\)/);
  });
});
