/**
 * Unit tests for ClozeNavbar component (src/components/cloze/cloze-navbar.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 1.2
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/cloze-navbar.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ClozeNavbar component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports ClozeNavbar function", () => {
    expect(source).toMatch(/export\s+function\s+ClozeNavbar/);
  });

  it("implements ClozeNavbarProps interface with songId and songTitle", () => {
    expect(source).toContain("songId: string");
    expect(source).toContain("songTitle: string");
  });

  it("renders a back link to /songs/${songId} (Req 1.2)", () => {
    expect(source).toContain("Link");
    expect(source).toMatch(/href=\{`\/songs\/\$\{songId\}`\}/);
  });

  it("uses Next.js Link component", () => {
    expect(source).toContain('import Link from "next/link"');
  });

  it("displays the song title (Req 1.2)", () => {
    expect(source).toContain("{songTitle}");
  });

  it('displays the label "Lückentext" (Req 1.2)', () => {
    expect(source).toContain("Lückentext");
  });

  it("uses flex layout with items-center", () => {
    expect(source).toContain("flex");
    expect(source).toContain("items-center");
  });

  it("has accessible back button with aria-label", () => {
    expect(source).toContain("aria-label");
    expect(source).toContain("Zurück");
  });

  it("has minimum touch target size for back button", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });
});
