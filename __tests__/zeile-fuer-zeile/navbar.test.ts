/**
 * Unit tests for ZeileFuerZeileNavbar component
 * (src/components/zeile-fuer-zeile/navbar.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required attributes and behavior patterns.
 *
 * Validates: Requirements 1.5, 8.1, 8.4
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/navbar.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ZeileFuerZeileNavbar component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports ZeileFuerZeileNavbar function", () => {
    expect(source).toMatch(/export\s+function\s+ZeileFuerZeileNavbar/);
  });

  it("implements props interface with songId and songTitle", () => {
    expect(source).toContain("songId: string");
    expect(source).toContain("songTitle: string");
  });

  it("renders a back link to /songs/${songId} (Req 1.5)", () => {
    expect(source).toContain("Link");
    expect(source).toMatch(/href=\{`\/songs\/\$\{songId\}`\}/);
  });

  it("uses Next.js Link component", () => {
    expect(source).toContain('import Link from "next/link"');
  });

  it("displays the song title (Req 1.5)", () => {
    expect(source).toContain("{songTitle}");
  });

  it('displays the label "Zeile für Zeile" (Req 1.5)', () => {
    expect(source).toContain("Zeile für Zeile");
  });

  it("uses flex layout with items-center", () => {
    expect(source).toContain("flex");
    expect(source).toContain("items-center");
  });

  it('has aria-label="Zurück zur Song-Detailseite" on back link (Req 8.1)', () => {
    expect(source).toContain('aria-label="Zurück zur Song-Detailseite"');
  });

  it("has minimum 44x44px touch target size for back button (Req 8.4)", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });
});
