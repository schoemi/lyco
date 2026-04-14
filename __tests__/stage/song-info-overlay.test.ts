/**
 * Unit-Test für Song-Info-Einblendung (src/app/stage/[songId]/page.tsx)
 *
 * Testet:
 * - shouldShowSongInfo gibt true zurück wenn songId sich ändert (Req 6.6)
 * - shouldShowSongInfo gibt false zurück wenn songId gleich bleibt
 * - shouldShowSongInfo gibt true zurück beim ersten Laden (prevSongId === null)
 * - 3-Sekunden-Overlay-Logik (via shouldShowSongInfo)
 */

import { describe, it, expect } from "vitest";
import { shouldShowSongInfo } from "@/app/stage/[songId]/page";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/stage/[songId]/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

describe("shouldShowSongInfo – Song-Info-Einblendung (Req 6.6)", () => {
  it("gibt true zurück wenn prevSongId null ist (erster Aufruf)", () => {
    expect(shouldShowSongInfo("song-1", null)).toBe(true);
  });

  it("gibt true zurück wenn songId sich von prevSongId unterscheidet", () => {
    expect(shouldShowSongInfo("song-2", "song-1")).toBe(true);
  });

  it("gibt false zurück wenn songId gleich prevSongId ist", () => {
    expect(shouldShowSongInfo("song-1", "song-1")).toBe(false);
  });

  it("gibt true zurück für beliebige unterschiedliche IDs", () => {
    expect(shouldShowSongInfo("abc", "xyz")).toBe(true);
    expect(shouldShowSongInfo("123", "456")).toBe(true);
  });

  it("gibt false zurück für identische IDs", () => {
    expect(shouldShowSongInfo("same-id", "same-id")).toBe(false);
  });
});

describe("Song-Info-Overlay Quellcode-Inspektion (Req 6.6)", () => {
  it("Seite enthält showSongInfo State", () => {
    expect(source).toContain("showSongInfo");
  });

  it("Overlay zeigt Song-Titel an", () => {
    expect(source).toContain("song.titel");
  });

  it("Overlay zeigt Künstler an", () => {
    expect(source).toContain("song.kuenstler");
  });

  it("Overlay wird nach 3 Sekunden ausgeblendet (setTimeout mit 3000ms)", () => {
    expect(source).toContain("3000");
    expect(source).toContain("setTimeout");
  });

  it("Overlay wird bei Song-Wechsel angezeigt (shouldShowSongInfo)", () => {
    expect(source).toContain("shouldShowSongInfo");
  });

  it("Overlay hat aria-live für Barrierefreiheit", () => {
    expect(source).toContain('aria-live="polite"');
  });
});
