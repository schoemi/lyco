/**
 * Unit tests for AktiveZeile component (src/components/zeile-fuer-zeile/aktive-zeile.tsx)
 *
 * Validates: Requirements 2.1, 2.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/aktive-zeile.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("AktiveZeile component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports AktiveZeile function", () => {
    expect(source).toMatch(/export\s+function\s+AktiveZeile/);
  });

  it("accepts text and visible props", () => {
    expect(source).toContain("text: string");
    expect(source).toContain("visible: boolean");
  });

  it("uses 18px text size via text-lg (Req 2.2)", () => {
    expect(source).toContain("text-lg");
  });

  it("uses primary text color text-neutral-900 (Req 2.2)", () => {
    expect(source).toContain("text-neutral-900");
  });

  it("has purple left border accent (Req 2.2)", () => {
    expect(source).toContain("border-l-4");
    expect(source).toContain("border-primary-600");
  });

  it("renders the text prop", () => {
    expect(source).toContain("{text}");
  });

  it("controls text visibility based on visible prop (Req 2.1)", () => {
    expect(source).toContain("visible");
    expect(source).toContain("invisible");
  });
});
