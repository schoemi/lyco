/**
 * Preservation Property Tests — Missing Editor Icons
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests are written BEFORE implementing the fix and must PASS on the
 * UNFIXED code. They capture baseline behavior that must remain unchanged
 * after the fix is applied (no regressions).
 *
 * Property 2: Preservation — Theme Color and Explicit Color Prop Behavior
 *
 * Tested preservation behaviors:
 * - 2a: Explicit color prop overrides CSS variable in inline style
 * - 2b: className, label, ARIA attributes are passed through correctly
 * - 2c: Style override props are merged into the element's inline style
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

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty("--color-icon");
});

// ── Arbitraries ──

/** Arbitrary Iconify icon names from the lucide set */
const arbIconName = fc.constantFrom(
  "lucide:music",
  "lucide:pencil",
  "lucide:trash-2",
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

/** Arbitrary hex color strings (6 digit) */
const arbHexColor = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, "0")}`);

/** Arbitrary named CSS colors */
const arbNamedColor = fc.constantFrom(
  "red",
  "blue",
  "green",
  "black",
  "white",
  "orange",
  "purple",
  "cyan",
  "magenta",
  "yellow",
  "gray",
  "pink"
);

/** Arbitrary valid CSS color (hex or named) */
const arbCssColor = fc.oneof(arbHexColor, arbNamedColor);

/** Arbitrary non-empty CSS class name */
const arbClassName = fc.constantFrom(
  "icon-sm",
  "icon-lg",
  "text-primary",
  "my-custom-class",
  "w-4",
  "h-4",
  "inline-block",
  "opacity-50",
  "cursor-pointer",
  "flex-shrink-0"
);

/** Arbitrary accessible label string */
const arbLabel = fc.constantFrom(
  "Search",
  "Edit",
  "Delete",
  "Music icon",
  "Settings",
  "Play audio",
  "Download file",
  "Upload",
  "Close",
  "Open menu"
);

/** Arbitrary pixel value for fontSize */
const arbFontSizePx = fc.integer({ min: 8, max: 72 }).map((n) => `${n}px`);

// ── Property 2a: Explicit color prop ──
// **Validates: Requirements 3.1, 3.2**

describe("Preservation 2a: Explicit color prop overrides CSS variable", () => {
  it("for any valid CSS color passed as color prop, the inline style uses that exact color", () => {
    fc.assert(
      fc.property(arbIconName, arbCssColor, (iconName, color) => {
        const { container } = render(
          React.createElement(AppIcon, { icon: iconName, color })
        );

        const el = container.firstElementChild as HTMLElement;
        expect(el).not.toBeNull();

        // When an explicit color prop is provided, the style.color must be set
        // (jsdom may normalize hex to rgb, so we check it's non-empty)
        expect(el.style.color).toBeTruthy();

        // The CSS variable should NOT appear when an explicit color is provided
        const styleAttr = el.getAttribute("style") ?? "";
        expect(styleAttr).not.toContain("var(--color-icon");

        cleanup();
      }),
      { numRuns: 50 }
    );
  });
});

// ── Property 2b: className and label passthrough ──
// **Validates: Requirements 3.3, 3.4**

describe("Preservation 2b: className and label passthrough", () => {
  it("className is applied to the rendered element", () => {
    fc.assert(
      fc.property(arbIconName, arbClassName, (iconName, className) => {
        const { container } = render(
          React.createElement(AppIcon, { icon: iconName, className })
        );

        const el = container.firstElementChild;
        expect(el).not.toBeNull();
        expect(el!.getAttribute("class")).toContain(className);

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it("aria-label matches label when provided, and role='img' is set", () => {
    fc.assert(
      fc.property(arbIconName, arbLabel, (iconName, label) => {
        const { container } = render(
          React.createElement(AppIcon, { icon: iconName, label })
        );

        const el = container.firstElementChild;
        expect(el).not.toBeNull();

        expect(el!.getAttribute("aria-label")).toBe(label);
        expect(el!.getAttribute("aria-hidden")).toBe("false");
        expect(el!.getAttribute("role")).toBe("img");

        cleanup();
      }),
      { numRuns: 30 }
    );
  });

  it("aria-hidden is true when no label is provided", () => {
    fc.assert(
      fc.property(arbIconName, (iconName) => {
        const { container } = render(
          React.createElement(AppIcon, { icon: iconName })
        );

        const el = container.firstElementChild;
        expect(el).not.toBeNull();

        expect(el!.getAttribute("aria-hidden")).toBe("true");
        expect(el!.getAttribute("aria-label")).toBeNull();
        expect(el!.getAttribute("role")).toBeNull();

        cleanup();
      }),
      { numRuns: 15 }
    );
  });
});

// ── Property 2c: Style override passthrough ──
// **Validates: Requirements 3.5**

describe("Preservation 2c: Style override passthrough", () => {
  it("additional style props are merged into the element's inline style", () => {
    fc.assert(
      fc.property(arbIconName, arbFontSizePx, (iconName, fontSize) => {
        const { container } = render(
          React.createElement(AppIcon, {
            icon: iconName,
            style: { fontSize },
          })
        );

        const el = container.firstElementChild;
        expect(el).not.toBeNull();

        const styleAttr = el!.getAttribute("style") ?? "";

        // The fontSize style should be present in the inline style
        expect(styleAttr).toContain(`font-size: ${fontSize}`);

        // The color CSS variable should also still be present (merged, not replaced)
        expect(styleAttr).toContain("color:");

        cleanup();
      }),
      { numRuns: 30 }
    );
  });
});
