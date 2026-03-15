/**
 * Unit tests for 100% completion handling in ClozePageClient
 * (src/app/(main)/songs/[id]/cloze/page.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required completion patterns: progress API calls,
 * session API calls, silent error handling, and single-fire guard.
 *
 * Validates: Requirements 5.3, 5.4
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/cloze/page.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ClozePage completion handling", () => {
  // --- Completion detection (Req 5.3, 5.4) ---

  it("detects 100% completion when score.correct reaches score.total", () => {
    // The source must check that correct >= total (or correct === total equivalent)
    expect(source).toMatch(/score\.correct\s*(<|>=)\s*score\.total/);
  });

  it("guards against zero total to avoid false completion", () => {
    expect(source).toMatch(/score\.total\s*===\s*0/);
  });

  // --- Progress API call (Req 5.3) ---

  it("calls PUT /api/progress on completion", () => {
    expect(source).toContain("/api/progress");
    expect(source).toMatch(/method:\s*"PUT"/);
  });

  it("sends stropheId and prozent: 100 in progress body", () => {
    expect(source).toContain("stropheId");
    expect(source).toContain("prozent: 100");
  });

  it("iterates over strophen to PUT progress for each", () => {
    // Must loop over song strophen
    expect(source).toMatch(/for\s*\(\s*(const|let|var)\s+\w+\s+of\s+song.*strophen\s*\)/);
  });

  // --- Session API call (Req 5.4) ---

  it("calls POST /api/sessions with LUECKENTEXT on completion", () => {
    // The completion block must contain a POST to /api/sessions
    expect(source).toContain("/api/sessions");
    expect(source).toMatch(/method:\s*"POST"/);
    expect(source).toContain("LUECKENTEXT");
  });

  it("sends songId and lernmethode in session body", () => {
    expect(source).toContain("songId");
    expect(source).toContain("lernmethode");
  });

  // --- Silent error handling ---

  it("wraps progress API call in try/catch for silent error handling", () => {
    // The persistCompletion function should have try/catch blocks
    // with empty catch bodies (silent error handling)
    const tryCatchCount = (source.match(/try\s*\{/g) || []).length;
    const catchCount = (source.match(/\}\s*catch\s*(\(\w*\))?\s*\{/g) || []).length;
    // At least 2 try/catch blocks in the completion section (progress + session)
    // plus the ones for initial load and session tracking
    expect(tryCatchCount).toBeGreaterThanOrEqual(4);
    expect(catchCount).toBeGreaterThanOrEqual(4);
  });

  it("has silent catch blocks (empty catch bodies) for API errors", () => {
    // Silent error handling = catch blocks with only comments or empty
    // Match catch blocks that contain only whitespace/comments
    const silentCatches = source.match(/catch\s*(\(\w*\))?\s*\{\s*(\/\/[^\n]*)?\s*\}/g);
    expect(silentCatches).not.toBeNull();
    expect(silentCatches!.length).toBeGreaterThanOrEqual(2);
  });

  // --- Completion fires only once ---

  it("uses a completionFired ref to prevent duplicate API calls", () => {
    expect(source).toContain("completionFired");
    expect(source).toMatch(/useRef\s*\(\s*false\s*\)/);
  });

  it("checks completionFired before making API calls", () => {
    expect(source).toMatch(/completionFired\.current/);
  });

  it("sets completionFired to true before persisting", () => {
    expect(source).toContain("completionFired.current = true");
  });

  it("resets completionFired on difficulty change", () => {
    // When difficulty changes, completionFired should be reset to false
    expect(source).toContain("completionFired.current = false");
  });
});
