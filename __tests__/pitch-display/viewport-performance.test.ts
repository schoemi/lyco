/**
 * Performance benchmark tests for PitchDisplay viewport recalculation.
 *
 * Verifies that viewport shift recalculation (berechneViewport + filterSichtbareBalken
 * + coordinate calculations) completes within 16ms for up to 10,000 frames,
 * ensuring smooth 60 FPS rendering.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 4.4
 */

import { describe, it, expect } from "vitest";
import {
  berechneViewport,
  filterSichtbareBalken,
  berechneSvgX,
  berechneSvgY,
  berechneMidiBereich,
} from "@/lib/pitch-display/pitch-coordinates";
import type { PitchBalken } from "@/lib/pitch-display/pitch-balken";

/**
 * Generates a realistic set of PitchBalken from a given number of frames.
 * Simulates a song where ~70% of frames are voiced, producing bars of varying lengths.
 * Each frame is ~10ms apart (100 FPS analysis rate), so 10,000 frames ≈ 100s song.
 */
function generateRealisticBalken(frameCount: number): PitchBalken[] {
  const balken: PitchBalken[] = [];
  const frameDurationMs = 10; // 10ms per frame
  let currentMs = 0;
  let inVoicedSegment = false;
  let segmentStartMs = 0;
  let segmentMidiSum = 0;
  let segmentFrameCount = 0;

  for (let i = 0; i < frameCount; i++) {
    // Simulate voiced/unvoiced transitions: ~70% voiced, segments of 5-50 frames
    const shouldBeVoiced =
      i % 7 !== 0 && // every 7th frame is unvoiced (gap between notes)
      !(i % 37 === 0); // occasional longer breaks

    if (shouldBeVoiced) {
      if (!inVoicedSegment) {
        inVoicedSegment = true;
        segmentStartMs = currentMs;
        segmentMidiSum = 0;
        segmentFrameCount = 0;
      }
      // Simulate a melody oscillating between MIDI 55-75
      const midiValue = 60 + 10 * Math.sin(i * 0.05);
      segmentMidiSum += midiValue;
      segmentFrameCount++;
    } else {
      if (inVoicedSegment && segmentFrameCount > 0) {
        balken.push({
          startMs: segmentStartMs,
          endMs: currentMs,
          midiValue: segmentMidiSum / segmentFrameCount,
          durationMs: currentMs - segmentStartMs,
        });
        inVoicedSegment = false;
      }
    }

    currentMs += frameDurationMs;
  }

  // Close final segment
  if (inVoicedSegment && segmentFrameCount > 0) {
    balken.push({
      startMs: segmentStartMs,
      endMs: currentMs,
      midiValue: segmentMidiSum / segmentFrameCount,
      durationMs: currentMs - segmentStartMs,
    });
  }

  return balken;
}

/**
 * Simulates a full viewport recalculation cycle as performed by PitchDisplay:
 * 1. berechneViewport — compute the visible time window
 * 2. filterSichtbareBalken — filter to only visible bars
 * 3. berechneMidiBereich — compute MIDI range (done once, but included for completeness)
 * 4. berechneSvgX/berechneSvgY — compute SVG coordinates for each visible bar
 */
function simulateViewportRecalculation(
  balken: PitchBalken[],
  currentTimeMs: number,
  windowDurationMs: number,
  svgWidth: number,
  svgHeight: number,
  midiMin: number,
  midiMax: number,
  padding: number,
) {
  const scaleMargin = 36;
  const plotWidth = svgWidth - scaleMargin;

  // Step 1: Compute viewport
  const viewport = berechneViewport(currentTimeMs, windowDurationMs);

  // Step 2: Filter visible bars
  const sichtbare = filterSichtbareBalken(balken, viewport);

  // Step 3: Compute SVG coordinates for each visible bar
  const barRects = sichtbare.map((b) => {
    const x = scaleMargin + berechneSvgX(b.startMs, viewport, plotWidth);
    const xEnd = scaleMargin + berechneSvgX(b.endMs, viewport, plotWidth);
    const w = Math.max(xEnd - x, 2);
    const y =
      berechneSvgY(b.midiValue, midiMin, midiMax, svgHeight, padding) - 3;
    return { x, y, width: w };
  });

  return { viewport, sichtbare, barRects };
}

describe("PitchDisplay viewport performance", () => {
  // Requirement 10.3: viewport shift recalculation within 16ms for 10,000 frames
  it("completes viewport recalculation within 16ms for 10,000 frames", () => {
    const frameCount = 10_000;
    const balken = generateRealisticBalken(frameCount);
    const windowDurationMs = 15_000;
    const svgWidth = 800;
    const svgHeight = 120;
    const padding = 12;

    // Pre-compute MIDI range (done once in useMemo, not per frame)
    const midiBereich = berechneMidiBereich(balken);
    const midiMin = midiBereich.min - 1;
    const midiMax = midiBereich.max + 1;

    // Simulate multiple viewport shifts across the song duration
    const songDurationMs = frameCount * 10;
    const shiftCount = 100; // simulate 100 viewport shifts
    const times: number[] = [];

    for (let i = 0; i < shiftCount; i++) {
      const currentTimeMs = (songDurationMs / shiftCount) * i;

      const start = performance.now();
      simulateViewportRecalculation(
        balken,
        currentTimeMs,
        windowDurationMs,
        svgWidth,
        svgHeight,
        midiMin,
        midiMax,
        padding,
      );
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }

    // Compute statistics
    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    const maxMs = Math.max(...times);
    const p95Index = Math.floor(times.length * 0.95);
    const sortedTimes = [...times].sort((a, b) => a - b);
    const p95Ms = sortedTimes[p95Index];

    // Requirement 10.3: recalculation must complete within 16ms
    // We check the 95th percentile to allow for occasional GC pauses
    expect(p95Ms).toBeLessThan(16);
    // Average should be well under 16ms
    expect(avgMs).toBeLessThan(16);
    // Even the worst case should be reasonable (allow some slack for CI)
    expect(maxMs).toBeLessThan(50);
  });

  // Requirement 10.2: only visible bars are rendered (virtualization effectiveness)
  it("filterSichtbareBalken returns a small subset of total bars for a 15s window", () => {
    const frameCount = 10_000;
    const balken = generateRealisticBalken(frameCount);
    const windowDurationMs = 15_000;
    const songDurationMs = frameCount * 10; // 100s

    // At any given time, only bars within the 15s window should be returned
    const currentTimeMs = songDurationMs / 2; // middle of song
    const viewport = berechneViewport(currentTimeMs, windowDurationMs);
    const sichtbare = filterSichtbareBalken(balken, viewport);

    // The visible bars should be a fraction of total bars
    // 15s window out of 100s song → roughly 15% of bars
    expect(sichtbare.length).toBeLessThan(balken.length);
    expect(sichtbare.length).toBeGreaterThan(0);

    // Verify all returned bars actually overlap the viewport
    for (const b of sichtbare) {
      expect(b.endMs).toBeGreaterThanOrEqual(viewport.startMs);
      expect(b.startMs).toBeLessThanOrEqual(viewport.endMs);
    }
  });

  // Requirement 10.1: smooth rendering at 30+ FPS for 10,000 frames
  it("sustains 30+ FPS equivalent throughput for continuous viewport shifts", () => {
    const frameCount = 10_000;
    const balken = generateRealisticBalken(frameCount);
    const windowDurationMs = 15_000;
    const svgWidth = 800;
    const svgHeight = 120;
    const padding = 12;

    const midiBereich = berechneMidiBereich(balken);
    const midiMin = midiBereich.min - 1;
    const midiMax = midiBereich.max + 1;

    const songDurationMs = frameCount * 10;

    // Simulate 1 second of continuous playback at 60 FPS (60 viewport shifts)
    const framesPerSecond = 60;
    const start = performance.now();

    for (let i = 0; i < framesPerSecond; i++) {
      const currentTimeMs =
        songDurationMs / 2 + (i * (1000 / framesPerSecond));
      simulateViewportRecalculation(
        balken,
        currentTimeMs,
        windowDurationMs,
        svgWidth,
        svgHeight,
        midiMin,
        midiMax,
        padding,
      );
    }

    const totalMs = performance.now() - start;

    // 60 recalculations should complete well within 1 second (1000ms)
    // For 30 FPS minimum, we need each frame under ~33ms, so 60 frames under 2000ms
    // In practice, these pure calculations should be much faster
    expect(totalMs).toBeLessThan(1000);

    // Effective FPS should be at least 30
    const effectiveFps = (framesPerSecond / totalMs) * 1000;
    expect(effectiveFps).toBeGreaterThan(30);
  });
});
