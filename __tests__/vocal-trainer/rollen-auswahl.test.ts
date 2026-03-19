/**
 * Unit tests for RollenAuswahl component
 * (src/components/vocal-trainer/rollen-auswahl.tsx)
 *
 * Source-based validation since the project uses node environment (no jsdom/RTL).
 *
 * Validates: Requirements 16.3, 16.11
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/vocal-trainer/rollen-auswahl.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("RollenAuswahl component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports RollenAuswahl function", () => {
    expect(source).toMatch(/export\s+function\s+RollenAuswahl/);
  });

  it("imports AudioRolle from generated prisma client", () => {
    expect(source).toContain("@/generated/prisma/client");
    expect(source).toContain("AudioRolle");
  });
});

describe("RollenAuswahl — Props interface", () => {
  it("accepts songId prop", () => {
    expect(source).toContain("songId: string");
  });

  it("accepts quelleId prop", () => {
    expect(source).toContain("quelleId: string");
  });

  it("accepts aktuelleRolle prop", () => {
    expect(source).toContain("aktuelleRolle: AudioRolle");
  });

  it("accepts optional onRolleGeaendert callback", () => {
    expect(source).toMatch(/onRolleGeaendert\??\s*:\s*\(rolle:\s*AudioRolle\)\s*=>\s*void/);
  });
});

describe("RollenAuswahl — Dropdown options (Req 16.3)", () => {
  it("includes Standard option", () => {
    expect(source).toContain("Standard");
    expect(source).toContain("STANDARD");
  });

  it("includes Instrumental option", () => {
    expect(source).toContain("Instrumental");
    expect(source).toContain("INSTRUMENTAL");
  });

  it("includes Referenz-Vokal option", () => {
    expect(source).toContain("Referenz-Vokal");
    expect(source).toContain("REFERENZ_VOKAL");
  });

  it("renders a <select> element", () => {
    expect(source).toContain("<select");
    expect(source).toContain("<option");
  });
});

describe("RollenAuswahl — Accessibility (Req 16.11)", () => {
  it('has aria-label="Rolle der Audio-Quelle"', () => {
    expect(source).toContain('aria-label="Rolle der Audio-Quelle"');
  });

  it("has error alert role for error messages", () => {
    expect(source).toContain('role="alert"');
  });
});

describe("RollenAuswahl — API request on change", () => {
  it("sends PUT request to the correct endpoint pattern", () => {
    expect(source).toContain("/api/songs/");
    expect(source).toContain("/audio-quellen/");
    expect(source).toContain('method: "PUT"');
  });

  it("sends rolle in the request body", () => {
    expect(source).toMatch(/JSON\.stringify.*rolle/s);
  });

  it("sets Content-Type header to application/json", () => {
    expect(source).toContain("application/json");
  });
});

describe("RollenAuswahl — Optimistic update and error handling", () => {
  it("stores previous rolle for rollback", () => {
    expect(source).toMatch(/previousRolle|prevRolle|vorherige/i);
  });

  it("reverts to previous value on error", () => {
    expect(source).toMatch(/setRolle\(previousRolle\)|setRolle\(prevRolle\)/);
  });

  it("tracks loading state", () => {
    expect(source).toContain("isLoading");
    expect(source).toContain("setIsLoading");
  });

  it("disables select during loading", () => {
    expect(source).toContain("disabled={isLoading}");
  });

  it("tracks error state", () => {
    expect(source).toContain("setError");
  });
});
