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
