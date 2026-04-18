/**
 * Unit-Tests für Koordinaten-Berechnungsfunktionen
 *
 * Testet die reinen Funktionen aus pitch-coordinates.ts:
 * - filterSichtbareBalken: Balken vollständig innerhalb, teilweise überlappend, vollständig außerhalb
 * - berechneSvgX: Grenzwerte und lineare Interpolation
 * - berechneSvgY: Grenzwerte, invertierte Y-Achse, Padding
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect } from 'vitest';
import {
  filterSichtbareBalken,
  berechneSvgX,
  berechneSvgY,
  berechneViewport,
  berechneMidiBereich,
  type Viewport,
} from '@/lib/pitch-display/pitch-coordinates';
import type { PitchBalken } from '@/lib/pitch-display/pitch-balken';

/** Helper: erzeugt einen PitchBalken mit Standardwerten */
function makeBalken(overrides: Partial<PitchBalken> & { startMs: number; endMs: number }): PitchBalken {
  return {
    midiValue: 60,
    durationMs: overrides.endMs - overrides.startMs,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// filterSichtbareBalken
// ---------------------------------------------------------------------------

describe('filterSichtbareBalken', () => {
  const viewport: Viewport = { startMs: 1000, endMs: 3000 };

  // Requirement 4.3: nur Balken im Sichtfenster rendern
  it('returns bars fully inside the viewport', () => {
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 1200, endMs: 1800 }),
      makeBalken({ startMs: 2000, endMs: 2500 }),
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(2);
  });

  it('returns bars partially overlapping the viewport start', () => {
    // Bar starts before viewport but ends inside
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 500, endMs: 1500 }),
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(1);
    expect(result[0].startMs).toBe(500);
  });

  it('returns bars partially overlapping the viewport end', () => {
    // Bar starts inside viewport but ends after
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 2500, endMs: 3500 }),
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(1);
    expect(result[0].startMs).toBe(2500);
  });

  it('returns bars that span the entire viewport', () => {
    // Bar starts before and ends after viewport
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 0, endMs: 5000 }),
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(1);
  });

  it('excludes bars fully before the viewport', () => {
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 0, endMs: 500 }),
      makeBalken({ startMs: 600, endMs: 999 }),
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(0);
  });

  it('excludes bars fully after the viewport', () => {
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 3001, endMs: 4000 }),
      makeBalken({ startMs: 5000, endMs: 6000 }),
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(0);
  });

  it('includes bars touching the viewport boundary exactly', () => {
    // Bar ends exactly at viewport start
    const barAtStart: PitchBalken[] = [
      makeBalken({ startMs: 500, endMs: 1000 }),
    ];
    expect(filterSichtbareBalken(barAtStart, viewport)).toHaveLength(1);

    // Bar starts exactly at viewport end
    const barAtEnd: PitchBalken[] = [
      makeBalken({ startMs: 3000, endMs: 4000 }),
    ];
    expect(filterSichtbareBalken(barAtEnd, viewport)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    const result = filterSichtbareBalken([], viewport);
    expect(result).toEqual([]);
  });

  it('filters a mix of inside, overlapping, and outside bars', () => {
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 0, endMs: 200 }),       // fully before → excluded
      makeBalken({ startMs: 800, endMs: 1200 }),     // overlaps start → included
      makeBalken({ startMs: 1500, endMs: 2000 }),    // fully inside → included
      makeBalken({ startMs: 2800, endMs: 3200 }),    // overlaps end → included
      makeBalken({ startMs: 4000, endMs: 5000 }),    // fully after → excluded
    ];

    const result = filterSichtbareBalken(balken, viewport);
    expect(result).toHaveLength(3);
    expect(result.map((b) => b.startMs)).toEqual([800, 1500, 2800]);
  });
});

// ---------------------------------------------------------------------------
// berechneSvgX
// ---------------------------------------------------------------------------

describe('berechneSvgX', () => {
  const viewport: Viewport = { startMs: 0, endMs: 10000 };
  const svgWidth = 800;

  // Requirement 4.1, 4.2: lineare Abbildung von Zeit auf X-Koordinate
  it('maps viewport start to x=0', () => {
    const x = berechneSvgX(0, viewport, svgWidth);
    expect(x).toBe(0);
  });

  it('maps viewport end to x=svgWidth', () => {
    const x = berechneSvgX(10000, viewport, svgWidth);
    expect(x).toBe(svgWidth);
  });

  it('maps midpoint to half of svgWidth', () => {
    const x = berechneSvgX(5000, viewport, svgWidth);
    expect(x).toBe(400);
  });

  it('maps time before viewport to negative x', () => {
    const x = berechneSvgX(-2000, viewport, svgWidth);
    expect(x).toBe(-160);
  });

  it('maps time after viewport to x > svgWidth', () => {
    const x = berechneSvgX(15000, viewport, svgWidth);
    expect(x).toBe(1200);
  });

  it('returns 0 when viewport duration is zero', () => {
    const zeroViewport: Viewport = { startMs: 5000, endMs: 5000 };
    const x = berechneSvgX(5000, zeroViewport, svgWidth);
    expect(x).toBe(0);
  });

  it('handles non-zero viewport start correctly', () => {
    const offsetViewport: Viewport = { startMs: 2000, endMs: 4000 };
    // timeMs=3000 is midpoint of [2000, 4000] → x = 400
    const x = berechneSvgX(3000, offsetViewport, svgWidth);
    expect(x).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// berechneSvgY
// ---------------------------------------------------------------------------

describe('berechneSvgY', () => {
  const svgHeight = 120;
  const padding = 10;
  // plotHeight = 120 - 2*10 = 100

  // Requirement 2.3: höhere MIDI-Werte → kleinere Y (oben)
  it('maps maximum MIDI value to top of plot area (y = padding)', () => {
    const y = berechneSvgY(80, 60, 80, svgHeight, padding);
    expect(y).toBe(padding); // 10
  });

  it('maps minimum MIDI value to bottom of plot area (y = svgHeight - padding)', () => {
    const y = berechneSvgY(60, 60, 80, svgHeight, padding);
    expect(y).toBe(svgHeight - padding); // 110
  });

  it('maps midpoint MIDI value to center of plot area', () => {
    const y = berechneSvgY(70, 60, 80, svgHeight, padding);
    // plotHeight = 100, midpoint → padding + plotHeight/2 = 10 + 50 = 60
    expect(y).toBe(60);
  });

  it('returns svgHeight/2 when midiRange is zero (all same pitch)', () => {
    const y = berechneSvgY(60, 60, 60, svgHeight, padding);
    expect(y).toBe(svgHeight / 2); // 60
  });

  it('respects padding parameter', () => {
    const largePadding = 30;
    // plotHeight = 120 - 2*30 = 60
    const yMax = berechneSvgY(80, 60, 80, svgHeight, largePadding);
    const yMin = berechneSvgY(60, 60, 80, svgHeight, largePadding);

    expect(yMax).toBe(largePadding); // 30
    expect(yMin).toBe(svgHeight - largePadding); // 90
  });

  it('higher MIDI values produce smaller Y coordinates', () => {
    const yLow = berechneSvgY(62, 60, 80, svgHeight, padding);
    const yHigh = berechneSvgY(78, 60, 80, svgHeight, padding);

    expect(yHigh).toBeLessThan(yLow);
  });

  it('handles zero padding', () => {
    // plotHeight = svgHeight = 120
    const yMax = berechneSvgY(80, 60, 80, svgHeight, 0);
    const yMin = berechneSvgY(60, 60, 80, svgHeight, 0);

    expect(yMax).toBe(0);
    expect(yMin).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// berechneViewport
// ---------------------------------------------------------------------------

describe('berechneViewport', () => {
  // Requirement 4.2: Cursor im linken Drittel
  it('positions cursor at one-third of the viewport', () => {
    const vp = berechneViewport(5000, 15000);
    // startMs = 5000 - 15000/3 = 0
    expect(vp.startMs).toBe(0);
    expect(vp.endMs).toBe(15000);
  });

  it('viewport duration equals windowDurationMs', () => {
    const vp = berechneViewport(10000, 20000);
    expect(vp.endMs - vp.startMs).toBe(20000);
  });

  it('allows negative startMs for early positions', () => {
    const vp = berechneViewport(1000, 15000);
    // startMs = 1000 - 5000 = -4000
    expect(vp.startMs).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// berechneMidiBereich
// ---------------------------------------------------------------------------

describe('berechneMidiBereich', () => {
  it('returns { min: 0, max: 0 } for empty array', () => {
    const result = berechneMidiBereich([]);
    expect(result).toEqual({ min: 0, max: 0 });
  });

  it('returns correct range for single bar', () => {
    const balken: PitchBalken[] = [makeBalken({ startMs: 0, endMs: 100, midiValue: 65 })];
    const result = berechneMidiBereich(balken);
    expect(result).toEqual({ min: 65, max: 65 });
  });

  it('returns correct min and max across multiple bars', () => {
    const balken: PitchBalken[] = [
      makeBalken({ startMs: 0, endMs: 100, midiValue: 60 }),
      makeBalken({ startMs: 200, endMs: 300, midiValue: 72 }),
      makeBalken({ startMs: 400, endMs: 500, midiValue: 55 }),
    ];
    const result = berechneMidiBereich(balken);
    expect(result).toEqual({ min: 55, max: 72 });
  });
});
