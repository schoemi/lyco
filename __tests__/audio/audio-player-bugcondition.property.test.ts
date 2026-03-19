/**
 * @vitest-environment jsdom
 */

/**
 * Bug-Condition Explorations-Test – Audio-Player-Bugs
 *
 * Dieser Test wird VOR der Implementierung des Fixes geschrieben und soll auf
 * dem unfixierten Code FEHLSCHLAGEN. Das Fehlschlagen bestätigt, dass die Bugs existieren.
 *
 * Bug 1 — Upload-Komponenten: AudioQuellenManager und CoverManager sind an
 * `editingText` statt `editing` gebunden. Im Metadaten-Bearbeitungsmodus
 * (`editing=true`) fehlen sie, im Text-Modus (`editingText=true`) werden sie
 * fälschlicherweise angezeigt.
 *
 * Bug 2 — Middleware blockiert Audio: Die `publicApiPrefixes`-Liste in
 * `middleware.ts` enthält `/api/uploads/` nicht, sodass Audio-Anfragen an
 * `/api/uploads/audio/{uuid}.mp3` mit 401 blockiert werden.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

// ── Bug 1: Source-code analysis of page.tsx ──
// We read the source of the song detail page and verify the conditional rendering
// logic binds upload components to the correct editing state.

const PAGE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/page.tsx",
);
const pageSource = fs.readFileSync(PAGE_SOURCE_PATH, "utf-8");

// ── Bug 2: Source-code analysis of middleware.ts ──

const MIDDLEWARE_PATH = path.resolve(process.cwd(), "middleware.ts");
const middlewareSource = fs.readFileSync(MIDDLEWARE_PATH, "utf-8");

// ── Arbitraries ──

/** Arbitrary song IDs */
const arbSongId = fc.stringMatching(/^[a-z0-9-]{8,36}$/);

/** Arbitrary UUID-based audio filenames */
const arbAudioUuid = fc.uuid();


// ── Bug 1a: Upload-Komponenten im editing-Modus sichtbar ──

describe("Bug Condition 1a: Upload-Komponenten sollen im editing-Modus gerendert werden", () => {
  /**
   * The page source must contain a block that renders AudioQuellenManager
   * and CoverManager when `editing` is true (not `editingText`).
   *
   * On unfixed code: The block uses `editingText` instead of `editing`,
   * so this test will FAIL — proving the bug exists.
   *
   * **Validates: Requirements 1.1, 2.1**
   */
  it("page.tsx should render AudioQuellenManager and CoverManager guarded by `editing` (not `editingText`)", () => {
    fc.assert(
      fc.property(arbSongId, (_songId) => {
        // Find the JSX block that contains AudioQuellenManager.
        // Expected: guarded by `editing && ` (not `editingText &&`)
        // Bug: the block uses `editingText` instead of `editing`

        // Extract all conditional rendering blocks that contain AudioQuellenManager or CoverManager
        // The pattern `&& editingText &&` or `editingText &&` before the component name
        // indicates the wrong binding.

        // Strategy: Find the nearest conditional guard before each component usage.
        // Split source at AudioQuellenManager and look at the preceding ~200 chars for the guard.
        const audioIdx = pageSource.lastIndexOf("AudioQuellenManager");
        const coverIdx = pageSource.lastIndexOf("CoverManager");

        expect(audioIdx).toBeGreaterThan(-1);
        expect(coverIdx).toBeGreaterThan(-1);

        // Look at the characters before each component for the conditional guard
        // AudioQuellenManager may be further from the guard (same block as CoverManager), so use a larger window
        const audioContext = pageSource.slice(Math.max(0, audioIdx - 600), audioIdx);
        const coverContext = pageSource.slice(Math.max(0, coverIdx - 300), coverIdx);

        // The guard should use `editing` (not `editingText`)
        // Find the last occurrence of `editing` or `editingText` in the context
        const audioGuardMatches = [...audioContext.matchAll(/\b(editingText|editing)\b/g)];
        const coverGuardMatches = [...coverContext.matchAll(/\b(editingText|editing)\b/g)];

        // The last match (closest to the component) should be `editing`, not `editingText`
        expect(audioGuardMatches.length).toBeGreaterThan(0);
        expect(coverGuardMatches.length).toBeGreaterThan(0);

        const audioGuard = audioGuardMatches[audioGuardMatches.length - 1][1];
        const coverGuard = coverGuardMatches[coverGuardMatches.length - 1][1];

        expect(audioGuard).toBe("editing");
        expect(coverGuard).toBe("editing");
      }),
      { numRuns: 1 },
    );
  });
});

// ── Bug 1b: Upload-Komponenten im editingText-Modus NICHT sichtbar ──

describe("Bug Condition 1b: Upload-Komponenten sollen im editingText-Modus NICHT gerendert werden", () => {
  /**
   * The page source must NOT contain a block that renders AudioQuellenManager
   * or CoverManager when `editingText` is true.
   *
   * On unfixed code: They ARE rendered in the editingText block,
   * so this test will FAIL — proving the bug exists.
   *
   * **Validates: Requirements 1.2, 2.2**
   */
  it("page.tsx should NOT render upload components in editingText block", () => {
    fc.assert(
      fc.property(arbSongId, (_songId) => {
        // There should be no block guarded by `editingText` that contains
        // AudioQuellenManager or CoverManager
        const editingTextWithUpload =
          /\{[^}]*\beditingText\b[^}]*\}[\s\S]{0,500}?(?:AudioQuellenManager|CoverManager)/;
        const hasWrongBinding = editingTextWithUpload.test(pageSource);

        expect(hasWrongBinding).toBe(false);
      }),
      { numRuns: 1 },
    );
  });
});

// ── Bug 2: Middleware blockiert Audio-Dateien ──

describe("Bug Condition 2: /api/uploads/ soll in publicApiPrefixes enthalten sein", () => {
  /**
   * The middleware must include `/api/uploads/` in the publicApiPrefixes list
   * so that audio file requests are not blocked with 401.
   *
   * On unfixed code: `/api/uploads/` is missing from the list,
   * so this test will FAIL — proving the bug exists.
   *
   * **Validates: Requirements 1.3, 1.4, 2.3, 2.4**
   */
  it("middleware.ts publicApiPrefixes should contain /api/uploads/", () => {
    fc.assert(
      fc.property(arbAudioUuid, (uuid) => {
        // The publicApiPrefixes array must contain "/api/uploads/"
        // This ensures that requests to /api/uploads/audio/{uuid}.mp3 are not blocked
        const publicPrefixesMatch = middlewareSource.match(
          /const\s+publicApiPrefixes\s*=\s*\[([\s\S]*?)\]/,
        );

        expect(publicPrefixesMatch).not.toBeNull();

        const prefixesContent = publicPrefixesMatch![1];
        const containsUploads = prefixesContent.includes("/api/uploads/");

        expect(containsUploads).toBe(true);
      }),
      { numRuns: 1 },
    );
  });

  it("audio requests to /api/uploads/audio/{uuid}.mp3 should not be blocked", () => {
    fc.assert(
      fc.property(arbAudioUuid, (uuid) => {
        const audioPath = `/api/uploads/audio/${uuid}.mp3`;

        // Simulate the isPublicRoute check from middleware
        // Extract the publicApiPrefixes from source
        const prefixesMatch = middlewareSource.match(
          /const\s+publicApiPrefixes\s*=\s*\[([\s\S]*?)\]/,
        );
        expect(prefixesMatch).not.toBeNull();

        // Parse the prefixes from the source
        const prefixStrings = prefixesMatch![1]
          .match(/"([^"]+)"/g)
          ?.map((s) => s.replace(/"/g, "")) ?? [];

        // Check if the audio path would be treated as public
        const isPublic = prefixStrings.some((prefix) =>
          audioPath.startsWith(prefix),
        );

        expect(isPublic).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
