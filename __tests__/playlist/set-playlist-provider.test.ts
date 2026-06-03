/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für SetPlaylistProvider — State-Transitionen und resolveAudioQuelle
 *
 * Testen:
 * - resolveAudioQuelle: Rolle-Auflösung, Fallback auf STANDARD, null ohne MP3
 * - PLAYING → PAUSED → PLAYING via togglePlay()
 * - PLAYING → ENDED nach onEnded des letzten Songs
 *
 * Requirements: 6.1, 6.2, 6.3, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import {
  resolveAudioQuelle,
  sortPlaylistSongs,
  SetPlaylistProvider,
  useSetPlaylist,
} from "@/components/songs/set-playlist-provider";
import type { PlaylistSong } from "@/types/playlist";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeQuelle(
  id: string,
  rolle: "STANDARD" | "INSTRUMENTAL" | "REFERENZ_VOKAL" = "STANDARD",
  typ: "MP3" | "SPOTIFY" | "YOUTUBE" = "MP3",
): AudioQuelleResponse {
  return {
    id,
    url: `https://example.com/${id}.mp3`,
    typ,
    label: "Test",
    orderIndex: 0,
    rolle,
  };
}

function makeSong(
  id: string,
  titel: string,
  orderIndex: number,
  audioQuellen: AudioQuelleResponse[],
): PlaylistSong {
  return { id, titel, kuenstler: null, orderIndex, audioQuellen };
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveAudioQuelle
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveAudioQuelle (Requirements 5.3, 5.4)", () => {
  // ── Exact role match ────────────────────────────────────────────────────

  it("returns the MP3 source matching the requested rolle exactly", () => {
    const standardQuelle = makeQuelle("q-std", "STANDARD");
    const instQuelle = makeQuelle("q-inst", "INSTRUMENTAL");
    const song = makeSong("s-1", "Song A", 0, [standardQuelle, instQuelle]);

    const result = resolveAudioQuelle(song, "INSTRUMENTAL");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("q-inst");
    expect(result!.rolle).toBe("INSTRUMENTAL");
  });

  it("returns REFERENZ_VOKAL source when available and requested", () => {
    const standardQuelle = makeQuelle("q-std", "STANDARD");
    const vokalQuelle = makeQuelle("q-vokal", "REFERENZ_VOKAL");
    const song = makeSong("s-1", "Song B", 0, [standardQuelle, vokalQuelle]);

    const result = resolveAudioQuelle(song, "REFERENZ_VOKAL");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("q-vokal");
  });

  it("returns STANDARD source when STANDARD is requested", () => {
    const standardQuelle = makeQuelle("q-std", "STANDARD");
    const song = makeSong("s-1", "Song C", 0, [standardQuelle]);

    const result = resolveAudioQuelle(song, "STANDARD");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("q-std");
  });

  // ── Fallback to STANDARD (Req. 5.3) ────────────────────────────────────

  it("falls back to STANDARD when requested rolle is not available", () => {
    // Only STANDARD exists — INSTRUMENTAL is not available
    const standardQuelle = makeQuelle("q-std", "STANDARD");
    const song = makeSong("s-1", "Song D", 0, [standardQuelle]);

    const result = resolveAudioQuelle(song, "INSTRUMENTAL");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("q-std");
    expect(result!.rolle).toBe("STANDARD");
  });

  it("falls back to STANDARD when REFERENZ_VOKAL is requested but unavailable", () => {
    const standardQuelle = makeQuelle("q-std", "STANDARD");
    const song = makeSong("s-1", "Song E", 0, [standardQuelle]);

    const result = resolveAudioQuelle(song, "REFERENZ_VOKAL");

    expect(result).not.toBeNull();
    expect(result!.rolle).toBe("STANDARD");
  });

  // ── null when no MP3 fallback exists (Req. 5.4) ────────────────────────

  it("returns null when no MP3 sources exist at all", () => {
    const song = makeSong("s-1", "Song F", 0, []);

    expect(resolveAudioQuelle(song, "STANDARD")).toBeNull();
    expect(resolveAudioQuelle(song, "INSTRUMENTAL")).toBeNull();
    expect(resolveAudioQuelle(song, "REFERENZ_VOKAL")).toBeNull();
  });

  it("returns null when all sources are non-MP3 (SPOTIFY, YOUTUBE)", () => {
    const spotify = makeQuelle("q-spotify", "STANDARD", "SPOTIFY");
    const youtube = makeQuelle("q-yt", "STANDARD", "YOUTUBE");
    const song = makeSong("s-1", "Song G", 0, [spotify, youtube]);

    const result = resolveAudioQuelle(song, "STANDARD");

    expect(result).toBeNull();
  });

  it("returns null when rolle not found and no STANDARD MP3 fallback exists", () => {
    // Song has only INSTRUMENTAL MP3 but not STANDARD — requesting REFERENZ_VOKAL
    // should not fall back to INSTRUMENTAL (only STANDARD is the fallback)
    const instQuelle = makeQuelle("q-inst", "INSTRUMENTAL");
    const song = makeSong("s-1", "Song H", 0, [instQuelle]);

    const result = resolveAudioQuelle(song, "REFERENZ_VOKAL");

    expect(result).toBeNull();
  });

  it("ignores non-MP3 sources when resolving", () => {
    // MP3 source for STANDARD, non-MP3 source for INSTRUMENTAL
    const mp3Standard = makeQuelle("q-std-mp3", "STANDARD", "MP3");
    const spotifyInst = makeQuelle("q-inst-spotify", "INSTRUMENTAL", "SPOTIFY");
    const song = makeSong("s-1", "Song I", 0, [mp3Standard, spotifyInst]);

    // Requesting INSTRUMENTAL — should NOT return the SPOTIFY source
    const instResult = resolveAudioQuelle(song, "INSTRUMENTAL");
    // Falls back to STANDARD MP3 (not the SPOTIFY INSTRUMENTAL)
    expect(instResult).not.toBeNull();
    expect(instResult!.typ).toBe("MP3");
    expect(instResult!.rolle).toBe("STANDARD");
  });

  it("prefers exact rolle match over STANDARD fallback", () => {
    // Both STANDARD and INSTRUMENTAL exist as MP3 — requesting INSTRUMENTAL
    // should return the exact match, not the fallback
    const standardQuelle = makeQuelle("q-std", "STANDARD");
    const instQuelle = makeQuelle("q-inst", "INSTRUMENTAL");
    const song = makeSong("s-1", "Song J", 0, [standardQuelle, instQuelle]);

    const result = resolveAudioQuelle(song, "INSTRUMENTAL");

    expect(result!.id).toBe("q-inst");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// State transitions: PLAYING → PAUSED → PLAYING via togglePlay()
// ─────────────────────────────────────────────────────────────────────────────

describe("togglePlay() state transitions (Requirements 6.1, 6.2, 6.3)", () => {
  // We test togglePlay() by rendering the Provider, starting a playlist via the
  // mocked API, and then calling togglePlay() via the context.
  // The isPlaying state is driven by the <audio> element's onPlay/onPause events.

  beforeEach(() => {
    // Mock fetch to return a minimal playlist
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        setId: "set-1",
        setName: "Test Set",
        songs: [
          {
            id: "song-1",
            titel: "Song One",
            kuenstler: null,
            orderIndex: 0,
            audioQuellen: [makeQuelle("q-1", "STANDARD")],
          },
          {
            id: "song-2",
            titel: "Song Two",
            kuenstler: null,
            orderIndex: 1,
            audioQuellen: [makeQuelle("q-2", "STANDARD")],
          },
        ],
        skippedSongCount: 0,
      }),
    });

    // Mock HTMLMediaElement play/pause (jsdom doesn't implement them)
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  /**
   * Captures the SetPlaylistState via a consumer component rendered inside the provider.
   */
  function renderProviderWithConsumer(setId: string) {
    let capturedContext: ReturnType<typeof useSetPlaylist> | null = null;

    function Consumer() {
      capturedContext = useSetPlaylist();
      return null;
    }

    render(
      React.createElement(
        SetPlaylistProvider,
        { setId },
        React.createElement(Consumer),
      ),
    );

    return {
      getContext: () => capturedContext!,
    };
  }

  it("isPlaying starts as false before playlist is started", () => {
    const { getContext } = renderProviderWithConsumer("set-1");
    expect(getContext().isPlaying).toBe(false);
  });

  it("togglePlay() on a paused audio element calls audio.play()", async () => {
    const { getContext } = renderProviderWithConsumer("set-1");

    // Start the playlist so that the audio element is rendered
    await act(async () => {
      getContext().startPlaylist();
    });

    // Reset the play mock call count
    const playSpy = window.HTMLMediaElement.prototype.play as ReturnType<typeof vi.fn>;
    playSpy.mockClear();

    // Simulate the audio element being paused by firing the onPause event
    // (which sets isPlaying = false in the provider)
    const audioEl = document.querySelector("audio");
    if (audioEl) {
      await act(async () => {
        audioEl.dispatchEvent(new Event("pause"));
      });
    }

    // Now call togglePlay — audio is paused so it should call play()
    await act(async () => {
      getContext().togglePlay();
    });

    expect(playSpy).toHaveBeenCalled();
  });

  it("togglePlay() on a playing audio element calls audio.pause()", async () => {
    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    const audioEl = document.querySelector("audio");
    expect(audioEl).not.toBeNull();

    // jsdom's HTMLMediaElement.paused is always true; override it to simulate playing state
    Object.defineProperty(audioEl, "paused", { get: () => false, configurable: true });

    const pauseSpy = window.HTMLMediaElement.prototype.pause as ReturnType<typeof vi.fn>;
    pauseSpy.mockClear();

    // togglePlay on a non-paused audio element should pause
    await act(async () => {
      getContext().togglePlay();
    });

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("isPlaying reflects false after onPause event fires", async () => {
    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    // Simulate audio playing
    const audioEl = document.querySelector("audio");
    if (audioEl) {
      await act(async () => {
        audioEl.dispatchEvent(new Event("play"));
      });
    }

    expect(getContext().isPlaying).toBe(true);

    // Simulate audio pausing
    if (audioEl) {
      await act(async () => {
        audioEl.dispatchEvent(new Event("pause"));
      });
    }

    expect(getContext().isPlaying).toBe(false);
  });

  it("isPlaying reflects true after onPlay event fires", async () => {
    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    const audioEl = document.querySelector("audio");
    if (audioEl) {
      await act(async () => {
        audioEl.dispatchEvent(new Event("play"));
      });
    }

    expect(getContext().isPlaying).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYING → ENDED: onEnded of the last song sets isPlaylistEnded = true
// ─────────────────────────────────────────────────────────────────────────────

describe("PLAYING → ENDED state transition (Requirement 6.2, 2.2)", () => {
  beforeEach(() => {
    // Playlist with only one song so "ended" is immediately the last song
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        setId: "set-1",
        setName: "Test Set",
        songs: [
          {
            id: "song-only",
            titel: "Only Song",
            kuenstler: null,
            orderIndex: 0,
            audioQuellen: [makeQuelle("q-only", "STANDARD")],
          },
        ],
        skippedSongCount: 0,
      }),
    });

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  function renderProviderWithConsumer(setId: string) {
    let capturedContext: ReturnType<typeof useSetPlaylist> | null = null;

    function Consumer() {
      capturedContext = useSetPlaylist();
      return null;
    }

    render(
      React.createElement(
        SetPlaylistProvider,
        { setId },
        React.createElement(Consumer),
      ),
    );

    return {
      getContext: () => capturedContext!,
    };
  }

  it("isPlaylistEnded is false before playlist ends", async () => {
    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    expect(getContext().isPlaylistEnded).toBe(false);
  });

  it("isPlaylistEnded becomes true and isPlaying becomes false after onEnded on last song", async () => {
    vi.useFakeTimers();

    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    const audioEl = document.querySelector("audio");
    expect(audioEl).not.toBeNull();

    // Fire the 'ended' event on the audio element (simulates last song finishing)
    await act(async () => {
      audioEl!.dispatchEvent(new Event("ended"));
    });

    // _advanceToNext uses a 300ms setTimeout — advance timers
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(getContext().isPlaylistEnded).toBe(true);
    expect(getContext().isPlaying).toBe(false);

    vi.useRealTimers();
  });

  it("isPlaylistActive remains true after playlist ends (player stays visible)", async () => {
    vi.useFakeTimers();

    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    const audioEl = document.querySelector("audio");
    await act(async () => {
      audioEl!.dispatchEvent(new Event("ended"));
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // The playlist remains active so the player UI stays visible (Req. 2.2)
    expect(getContext().isPlaylistActive).toBe(true);

    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-advance: onEnded mid-playlist moves to next song
// ─────────────────────────────────────────────────────────────────────────────

describe("Auto-advance: onEnded triggers next song (Requirement 2.1, 2.2)", () => {
  beforeEach(() => {
    // Two-song playlist
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        setId: "set-1",
        setName: "Test Set",
        songs: [
          {
            id: "song-1",
            titel: "First",
            kuenstler: null,
            orderIndex: 0,
            audioQuellen: [makeQuelle("q-1", "STANDARD")],
          },
          {
            id: "song-2",
            titel: "Second",
            kuenstler: null,
            orderIndex: 1,
            audioQuellen: [makeQuelle("q-2", "STANDARD")],
          },
        ],
        skippedSongCount: 0,
      }),
    });

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  function renderProviderWithConsumer(setId: string) {
    let capturedContext: ReturnType<typeof useSetPlaylist> | null = null;

    function Consumer() {
      capturedContext = useSetPlaylist();
      return null;
    }

    render(
      React.createElement(
        SetPlaylistProvider,
        { setId },
        React.createElement(Consumer),
      ),
    );

    return {
      getContext: () => capturedContext!,
    };
  }

  it("advances activeSongIndex after onEnded when there is a next song", async () => {
    vi.useFakeTimers();

    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    expect(getContext().activeSongIndex).toBe(0);

    const audioEl = document.querySelector("audio");
    await act(async () => {
      audioEl!.dispatchEvent(new Event("ended"));
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(getContext().activeSongIndex).toBe(1);
    expect(getContext().isPlaylistEnded).toBe(false);

    vi.useRealTimers();
  });

  it("does NOT set isPlaylistEnded after first song ends when second song exists", async () => {
    vi.useFakeTimers();

    const { getContext } = renderProviderWithConsumer("set-1");

    await act(async () => {
      getContext().startPlaylist();
    });

    const audioEl = document.querySelector("audio");
    await act(async () => {
      audioEl!.dispatchEvent(new Event("ended"));
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(getContext().isPlaylistEnded).toBe(false);

    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sortPlaylistSongs
// ─────────────────────────────────────────────────────────────────────────────

describe("sortPlaylistSongs (Requirement 1.5)", () => {
  it("sorts by orderIndex ascending", () => {
    const songs = [
      makeSong("s-3", "C", 2, []),
      makeSong("s-1", "A", 0, []),
      makeSong("s-2", "B", 1, []),
    ];

    const sorted = sortPlaylistSongs(songs);

    expect(sorted[0].orderIndex).toBe(0);
    expect(sorted[1].orderIndex).toBe(1);
    expect(sorted[2].orderIndex).toBe(2);
  });

  it("uses titel as tiebreaker when orderIndex is equal", () => {
    const songs = [
      makeSong("s-c", "Zebra", 0, []),
      makeSong("s-a", "Alpha", 0, []),
      makeSong("s-b", "Mitte", 0, []),
    ];

    const sorted = sortPlaylistSongs(songs);

    expect(sorted[0].titel).toBe("Alpha");
    expect(sorted[1].titel).toBe("Mitte");
    expect(sorted[2].titel).toBe("Zebra");
  });

  it("does not mutate the original array", () => {
    const songs = [
      makeSong("s-b", "B", 1, []),
      makeSong("s-a", "A", 0, []),
    ];
    const original = [...songs];

    sortPlaylistSongs(songs);

    expect(songs[0].id).toBe(original[0].id);
    expect(songs[1].id).toBe(original[1].id);
  });

  it("returns empty array for empty input", () => {
    expect(sortPlaylistSongs([])).toEqual([]);
  });
});
