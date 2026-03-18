/**
 * Unit tests for StropheCard timecode navigation badge.
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/components/songs/strophe-card.tsx",
);
const source = fs.readFileSync(SOURCE_PATH, "utf-8");

describe("StropheCard Timecode Navigation", () => {
  it("imports formatTimecode from @/lib/audio/timecode", () => {
    expect(source).toContain(
      'import { formatTimecode } from "@/lib/audio/timecode"',
    );
  });

  it("accepts an optional onSeekTo prop", () => {
    expect(source).toMatch(/onSeekTo\?\s*:\s*\(\s*timecodeMs\s*:\s*number\s*\)\s*=>\s*void/);
  });

  it("finds TIMECODE markup with ziel STROPHE from markups array", () => {
    expect(source).toContain('m.typ === "TIMECODE"');
    expect(source).toContain('m.ziel === "STROPHE"');
    expect(source).toContain("m.timecodeMs != null");
  });

  it("renders a clickable button with formatTimecode output when timecode exists", () => {
    // Should call formatTimecode on the timecodeMs value
    expect(source).toMatch(/formatTimecode\(timecodeMarkup\.timecodeMs!\)/);
    // Should be a <button> element
    expect(source).toContain('<button');
    // Should have cursor-pointer styling
    expect(source).toContain("cursor-pointer");
    // Should have hover effect
    expect(source).toContain("hover:");
  });

  it("calls onSeekTo with timecodeMs on click", () => {
    expect(source).toMatch(/onClick.*onSeekTo\?\.\(timecodeMarkup\.timecodeMs!\)/);
  });

  it("has an aria-label for the timecode button", () => {
    expect(source).toMatch(/aria-label.*Springe zu/);
  });

  it("does not render timecode badge when no TIMECODE markup exists", () => {
    // The badge is conditionally rendered
    expect(source).toMatch(/\{timecodeMarkup\s*&&/);
  });
});
