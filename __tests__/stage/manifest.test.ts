/**
 * Unit-Test für PWA-Manifest (src/app/manifest.ts)
 *
 * Testet:
 * - Manifest-Feld display: "standalone" (Anforderung 2.1)
 * - Manifest-Feld theme_color: "#000000" (Anforderung 2.1)
 * - Manifest-Feld start_url: "/stage" (Anforderung 2.1)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const MANIFEST_PATH = path.resolve(process.cwd(), "src/app/manifest.ts");
const source = fs.readFileSync(MANIFEST_PATH, "utf-8");

describe("PWA Manifest source (Req 2.1)", () => {
  it('contains display: "standalone"', () => {
    expect(source).toContain('"standalone"');
    expect(source).toContain("display");
  });

  it('contains theme_color: "#000000"', () => {
    expect(source).toContain("theme_color");
    expect(source).toContain('"#000000"');
  });

  it('contains start_url: "/stage"', () => {
    expect(source).toContain("start_url");
    expect(source).toContain('"/stage"');
  });

  it("exports a default function", () => {
    expect(source).toContain("export default function manifest");
  });

  it("uses MetadataRoute.Manifest type", () => {
    expect(source).toContain("MetadataRoute.Manifest");
  });
});

// --- Integration: call the manifest function and verify fields ---

describe("PWA Manifest function", () => {
  it("returns manifest with required fields", async () => {
    const { default: manifest } = await import("../../src/app/manifest");
    const result = manifest();

    expect(result.display).toBe("standalone");
    expect(result.theme_color).toBe("#000000");
    expect(result.start_url).toBe("/stage");
  });

  it("returns correct name fields", async () => {
    const { default: manifest } = await import("../../src/app/manifest");
    const result = manifest();

    expect(result.name).toBe("Lyco Stage");
    expect(result.short_name).toBe("Lyco Stage");
  });
});
