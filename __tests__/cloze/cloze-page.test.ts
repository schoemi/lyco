/**
 * Unit tests for ClozePageClient (src/app/(main)/songs/[id]/cloze/page.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the component source for required patterns: auth redirect, error handling,
 * loading indicator, and session tracking.
 *
 * Validates: Requirements 1.6, 1.7
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/cloze/page.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

describe("ClozePage component source", () => {
  // --- Directive and imports ---

  it('uses "use client" directive', () => {
    expect(source).toContain('"use client"');
  });

  it("imports useRouter from next/navigation", () => {
    expect(source).toContain("useRouter");
    expect(source).toContain("next/navigation");
  });

  it("imports useParams from next/navigation", () => {
    expect(source).toContain("useParams");
  });

  // --- Auth redirect (Req 1.6) ---

  it("redirects to /login on 401 status (Req 1.6)", () => {
    expect(source).toContain("401");
    expect(source).toContain('"/login"');
    // Verify redirect is triggered via router
    expect(source).toMatch(/router\.replace\(\s*"\/login"\s*\)/);
  });

  // --- 403/404 handling (Req 1.7) ---

  it("redirects to /dashboard on 403 status (Req 1.7)", () => {
    expect(source).toContain("403");
    expect(source).toContain('"/dashboard"');
  });

  it("redirects to /dashboard on 404 status (Req 1.7)", () => {
    expect(source).toContain("404");
    expect(source).toMatch(/router\.replace\(\s*"\/dashboard"\s*\)/);
  });

  it("handles both 403 and 404 with dashboard redirect", () => {
    // Verify the combined condition for 403 || 404
    expect(source).toMatch(/status\s*===\s*403\s*\|\|\s*\w+\.status\s*===\s*404/);
  });

  // --- Loading indicator ---

  it("has a loading state variable", () => {
    expect(source).toContain("useState(true)");
    expect(source).toContain("loading");
    expect(source).toContain("setLoading");
  });

  it('displays "Song wird geladen" text during loading', () => {
    expect(source).toContain("Song wird geladen");
  });

  it("renders loading indicator when loading is true", () => {
    expect(source).toMatch(/if\s*\(\s*loading\s*\)/);
  });

  // --- Error handling ---

  it("has an error state variable", () => {
    expect(source).toContain("useState<string | null>(null)");
    expect(source).toContain("error");
    expect(source).toContain("setError");
  });

  it("displays error message with Fehler text", () => {
    expect(source).toContain("Fehler");
    expect(source).toContain("{error}");
  });

  it("renders error state with red styling", () => {
    expect(source).toContain("border-error-200");
    expect(source).toContain("bg-error-50");
    expect(source).toContain("text-error-700");
  });

  it("renders error block when error is set", () => {
    expect(source).toMatch(/if\s*\(\s*error\s*\)/);
  });

  // --- Empty strophen handling ---

  it('displays "Dieser Song hat noch keine Strophen" for empty strophen', () => {
    expect(source).toContain("Dieser Song hat noch keine Strophen");
  });

  it("checks for empty strophen array", () => {
    expect(source).toMatch(/strophen\.length\s*===\s*0/);
  });

  // --- API fetch ---

  it("fetches song data from /api/songs/${id}", () => {
    expect(source).toMatch(/fetch\(\s*`\/api\/songs\/\$\{id\}`\s*\)/);
  });

  // --- Session tracking with LUECKENTEXT ---

  it("tracks session with LUECKENTEXT lernmethode", () => {
    expect(source).toContain("LUECKENTEXT");
    expect(source).toContain("/api/sessions");
  });

  it("sends session tracking POST request", () => {
    expect(source).toMatch(/method:\s*"POST"/);
    expect(source).toContain("lernmethode");
  });
});
