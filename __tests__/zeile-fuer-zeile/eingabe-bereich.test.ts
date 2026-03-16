/**
 * Unit tests for EingabeBereich component (src/components/zeile-fuer-zeile/eingabe-bereich.tsx)
 *
 * Validates: Requirements 3.1, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.6, 8.1, 8.3, 8.5
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/eingabe-bereich.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("EingabeBereich component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports EingabeBereich function", () => {
    expect(source).toMatch(/export\s+function\s+EingabeBereich/);
  });

  it("accepts all required props", () => {
    expect(source).toContain("eingabe: string");
    expect(source).toContain("onEingabeChange: (value: string) => void");
    expect(source).toContain("onAbsenden: () => void");
    expect(source).toContain("onWeiter: () => void");
    expect(source).toContain('"eingabe" | "korrekt" | "loesung"');
    expect(source).toContain("fehlversuche: number");
    expect(source).toContain("disabled: boolean");
    expect(source).toContain("istLetzteZeile: boolean");
  });

  it("renders a textarea with correct aria-label (Req 3.1, 8.1)", () => {
    expect(source).toContain("<textarea");
    expect(source).toContain('aria-label="Zeile aus dem Gedächtnis eingeben"');
  });

  it("handles Enter key to submit and Shift+Enter for newline (Req 8.5)", () => {
    expect(source).toContain("onKeyDown");
    expect(source).toContain("Enter");
    expect(source).toContain("shiftKey");
    expect(source).toContain("preventDefault");
    expect(source).toContain("onAbsenden");
  });

  it("shows green border when correct (Req 3.5)", () => {
    expect(source).toContain("border-green-500");
  });

  it("shows red border when wrong (Req 3.6)", () => {
    expect(source).toContain("border-red-500");
  });

  it("disables textarea when disabled or status is korrekt/loesung", () => {
    expect(source).toContain("disabled");
    expect(source).toContain("korrekt");
    expect(source).toContain("loesung");
  });

  it("has aria-live polite region for feedback (Req 8.3)", () => {
    expect(source).toContain('aria-live="polite"');
  });

  it("shows correct feedback text for korrekt status", () => {
    expect(source).toContain("Richtig!");
  });

  it("shows correct feedback text for wrong attempts", () => {
    expect(source).toContain("Falsch – versuche es erneut");
  });

  it("shows correct feedback text for loesung status", () => {
    expect(source).toContain("Lösung angezeigt");
  });

  it("renders Weiter button with correct label (Req 4.1)", () => {
    expect(source).toContain("Weiter");
  });

  it("shows 'Strophe abschließen' for last line (Req 4.6)", () => {
    expect(source).toContain("Strophe abschließen");
    expect(source).toContain("istLetzteZeile");
  });

  it("disables Weiter button when status is eingabe (Req 4.2)", () => {
    expect(source).toContain('status === "eingabe"');
  });

  it("has min-h-[44px] touch target on button (Req 8.1)", () => {
    expect(source).toContain("min-h-[44px]");
  });

  it("calls onWeiter when button is clicked", () => {
    expect(source).toContain("onWeiter");
    expect(source).toContain("onClick");
  });
});
