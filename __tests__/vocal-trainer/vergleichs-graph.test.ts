/**
 * Unit tests for VergleichsGraph component
 * (src/components/vocal-trainer/vergleichs-graph.tsx)
 *
 * Source-based validation since the project uses node environment (no jsdom/RTL).
 *
 * Validates: Requirements 9.1, 9.2, 14.8
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/vocal-trainer/vergleichs-graph.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("VergleichsGraph component source", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"');
  });

  it("exports VergleichsGraph function", () => {
    expect(source).toMatch(/export\s+function\s+VergleichsGraph/);
  });
});

describe("VergleichsGraph — Props interface (Req 9.1)", () => {
  it("accepts referenzKurve prop with timestampMs and midiValue", () => {
    expect(source).toContain("referenzKurve");
    expect(source).toContain("timestampMs");
    expect(source).toContain("midiValue");
  });

  it("accepts nutzerKurve prop with abweichungCents", () => {
    expect(source).toContain("nutzerKurve");
    expect(source).toContain("abweichungCents");
  });
});

describe("VergleichsGraph — SVG rendering (Req 9.1)", () => {
  it("renders an SVG element", () => {
    expect(source).toContain("<svg");
  });

  it("uses viewBox for scaling", () => {
    expect(source).toContain("viewBox");
  });

  it("renders reference curve as a polyline", () => {
    expect(source).toContain("<polyline");
  });

  it("renders user curve as line segments", () => {
    expect(source).toContain("<line");
  });

  it("uses role=img on the SVG", () => {
    expect(source).toContain('role="img"');
  });
});

describe("VergleichsGraph — Color coding (Req 9.2)", () => {
  it("uses green (#22c55e) for deviations < 50 cents", () => {
    expect(source).toContain("#22c55e");
  });

  it("uses yellow (#eab308) for deviations 50–100 cents", () => {
    expect(source).toContain("#eab308");
  });

  it("uses red (#ef4444) for deviations > 100 cents", () => {
    expect(source).toContain("#ef4444");
  });

  it("categorizes based on absolute value of cents", () => {
    expect(source).toContain("Math.abs");
  });

  it("applies < 50 threshold for green", () => {
    expect(source).toMatch(/abs\s*<\s*50/);
  });

  it("applies <= 100 threshold for yellow", () => {
    expect(source).toMatch(/abs\s*<=\s*100/);
  });
});

describe("VergleichsGraph — Reference curve styling", () => {
  it("uses a gray/blue stroke for the reference curve", () => {
    // slate-400 = #94a3b8
    expect(source).toContain("#94a3b8");
  });
});

describe("VergleichsGraph — aria-label (Req 14.8)", () => {
  it("has aria-label on the SVG", () => {
    expect(source).toContain("aria-label={ariaLabel}");
  });

  it("includes percentage summary in aria-label", () => {
    expect(source).toContain("% gut");
    expect(source).toContain("% akzeptabel");
    expect(source).toContain("% fehlerhaft");
  });

  it("starts with Pitch-Vergleich prefix", () => {
    expect(source).toContain("Pitch-Vergleich:");
  });
});

describe("VergleichsGraph — Empty data handling", () => {
  it("handles empty data gracefully with a message", () => {
    expect(source).toContain("Keine Daten vorhanden");
  });

  it("checks for empty referenzKurve and nutzerKurve", () => {
    expect(source).toContain("referenzKurve.length === 0");
    expect(source).toContain("nutzerKurve.length === 0");
  });
});

describe("VergleichsGraph — Tailwind container styling", () => {
  it("uses Tailwind CSS classes for the container", () => {
    expect(source).toContain("className=");
    expect(source).toContain("rounded");
    expect(source).toContain("border");
  });
});
