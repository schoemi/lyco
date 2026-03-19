/**
 * Unit tests for KopfhoererHinweis component
 * (src/components/vocal-trainer/kopfhoerer-hinweis.tsx)
 *
 * Source-based validation since the project uses node environment (no jsdom/RTL).
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/vocal-trainer/kopfhoerer-hinweis.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("KopfhoererHinweis component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports KopfhoererHinweis function", () => {
    expect(source).toMatch(/export\s+function\s+KopfhoererHinweis/);
  });

  it("implements props interface with onBestaetigt", () => {
    expect(source).toContain("onBestaetigt: () => void");
  });
});

describe("KopfhoererHinweis — localStorage flag (Req 2.1, 2.3)", () => {
  it("uses the correct localStorage key", () => {
    expect(source).toContain("vocal-trainer-kopfhoerer-bestaetigt");
  });

  it("reads localStorage to check if already confirmed", () => {
    expect(source).toContain("localStorage.getItem");
  });

  it("writes to localStorage on confirmation", () => {
    expect(source).toContain("localStorage.setItem");
  });

  it("returns null when already confirmed", () => {
    expect(source).toMatch(/alreadyConfirmed.*return null|if\s*\(alreadyConfirmed\)\s*return null/s);
  });

  it("calls onBestaetigt immediately when flag is set", () => {
    expect(source).toContain("onBestaetigt()");
  });
});

describe("KopfhoererHinweis — Modal dialog (Req 2.1)", () => {
  it('has role="dialog"', () => {
    expect(source).toContain('role="dialog"');
  });

  it('has aria-modal="true"', () => {
    expect(source).toContain('aria-modal="true"');
  });

  it('has aria-label="Kopfhörer-Hinweis"', () => {
    expect(source).toContain('aria-label="Kopfhörer-Hinweis"');
  });
});

describe("KopfhoererHinweis — Headphone recommendation text (Req 2.2)", () => {
  it("contains headphone recommendation", () => {
    expect(source).toMatch(/Kopfhörer/);
  });

  it("explains the reason for headphones (acoustic feedback)", () => {
    expect(source).toMatch(/Mikrofon|verfälsch/);
  });
});

describe("KopfhoererHinweis — Confirm button", () => {
  it('has a "Verstanden" button', () => {
    expect(source).toContain("Verstanden");
  });

  it("has minimum 44x44px touch target size", () => {
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("min-w-[44px]");
  });
});

describe("KopfhoererHinweis — Escape key handling", () => {
  it("listens for Escape key", () => {
    expect(source).toContain('"Escape"');
  });

  it("adds keydown event listener", () => {
    expect(source).toContain("addEventListener");
    expect(source).toContain('"keydown"');
  });

  it("removes keydown event listener on cleanup", () => {
    expect(source).toContain("removeEventListener");
  });
});

describe("KopfhoererHinweis — Focus management", () => {
  it("implements focus trap for Tab key", () => {
    expect(source).toContain('"Tab"');
  });

  it("focuses button on open", () => {
    expect(source).toContain("buttonRef");
    expect(source).toMatch(/buttonRef\.current\?\.focus\(\)/);
  });
});

describe("KopfhoererHinweis — Backdrop", () => {
  it("renders a semi-transparent backdrop overlay", () => {
    expect(source).toContain("bg-black/50");
  });

  it("uses fixed positioning for full-screen overlay", () => {
    expect(source).toContain("fixed inset-0");
  });
});
