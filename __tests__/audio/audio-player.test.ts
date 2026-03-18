/**
 * @vitest-environment jsdom
 */

/**
 * Unit-Tests für Audio-Player
 *
 * Testen: MP3-Rendering mit <audio>, Spotify/YouTube-Embed-Rendering,
 * Quellen-Umschalter, Seek-Verhalten
 *
 * Anforderungen: 2.1, 2.2, 2.3, 4.1, 4.3
 */

import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AudioPlayer } from "@/components/songs/audio-player";
import type { AudioPlayerHandle } from "@/components/songs/audio-player";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
});

function makeQuelle(
  typ: "MP3" | "SPOTIFY" | "YOUTUBE",
  overrides?: Partial<AudioQuelleResponse>,
): AudioQuelleResponse {
  const urls: Record<string, string> = {
    MP3: "https://example.com/song.mp3",
    SPOTIFY: "https://open.spotify.com/track/abc123",
    YOUTUBE: "https://www.youtube.com/watch?v=xyz789",
  };
  return {
    id: `quelle-${typ.toLowerCase()}`,
    url: urls[typ],
    typ,
    label: `Test ${typ}`,
    orderIndex: 0,
    ...overrides,
  };
}

describe("AudioPlayer Unit-Tests", () => {
  // 1. Renders <audio> element for MP3 source
  it("renders <audio> element for MP3 source", () => {
    const mp3 = makeQuelle("MP3");
    const { container } = render(
      React.createElement(AudioPlayer, { audioQuellen: [mp3] }),
    );

    const audioEl = container.querySelector("audio");
    expect(audioEl).not.toBeNull();
    expect(audioEl!.getAttribute("src")).toBe(mp3.url);
  });

  // 2. Renders Spotify iframe embed for SPOTIFY source
  it("renders Spotify iframe embed for SPOTIFY source", () => {
    const spotify = makeQuelle("SPOTIFY");
    render(
      React.createElement(AudioPlayer, { audioQuellen: [spotify] }),
    );

    const iframe = screen.getByTitle(/Spotify/i);
    expect(iframe).toBeDefined();
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("src")).toContain("open.spotify.com/embed/track");
  });

  // 3. Renders YouTube iframe embed for YOUTUBE source
  it("renders YouTube iframe embed for YOUTUBE source", () => {
    const youtube = makeQuelle("YOUTUBE");
    render(
      React.createElement(AudioPlayer, { audioQuellen: [youtube] }),
    );

    const iframe = screen.getByTitle(/YouTube/i);
    expect(iframe).toBeDefined();
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.getAttribute("src")).toContain("youtube.com/embed");
  });

  // 4. Shows source switcher tabs when multiple sources exist
  it("shows source switcher tabs when multiple sources exist", () => {
    const quellen = [
      makeQuelle("MP3", { orderIndex: 0 }),
      makeQuelle("SPOTIFY", { orderIndex: 1, id: "quelle-spotify-2" }),
    ];
    render(
      React.createElement(AudioPlayer, { audioQuellen: quellen }),
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toBe("Test MP3");
    expect(tabs[1].textContent).toBe("Test SPOTIFY");
  });

  // 5. Does not show source switcher when only one source
  it("does not show source switcher when only one source", () => {
    const mp3 = makeQuelle("MP3");
    render(
      React.createElement(AudioPlayer, { audioQuellen: [mp3] }),
    );

    const tabs = screen.queryAllByRole("tab");
    expect(tabs.length).toBe(0);
  });

  // 6. Shows "Keine Audio-Quellen vorhanden" when no sources
  it('shows "Keine Audio-Quellen vorhanden" when no sources', () => {
    render(
      React.createElement(AudioPlayer, { audioQuellen: [] }),
    );

    expect(screen.getByText(/Keine Audio-Quellen vorhanden/)).toBeDefined();
  });

  // 7. seekTo returns true for MP3 source (mock audio.currentTime setter)
  it("seekTo returns true for MP3 source", () => {
    const ref = React.createRef<AudioPlayerHandle>();
    const mp3 = makeQuelle("MP3");

    render(
      React.createElement(AudioPlayer, { ref, audioQuellen: [mp3] }),
    );

    expect(ref.current).not.toBeNull();
    const result = ref.current!.seekTo(5000);
    expect(result).toBe(true);
  });

  // 8. seekTo returns false for non-MP3 source
  it("seekTo returns false for non-MP3 source", () => {
    const ref = React.createRef<AudioPlayerHandle>();
    const spotify = makeQuelle("SPOTIFY");

    render(
      React.createElement(AudioPlayer, { ref, audioQuellen: [spotify] }),
    );

    expect(ref.current).not.toBeNull();
    const result = ref.current!.seekTo(5000);
    expect(result).toBe(false);
  });

  // 9. Switching sources resets player state
  it("switching sources resets player state", () => {
    const quellen = [
      makeQuelle("MP3", { orderIndex: 0 }),
      makeQuelle("SPOTIFY", { orderIndex: 1, id: "quelle-spotify-2" }),
    ];
    const { container } = render(
      React.createElement(AudioPlayer, { audioQuellen: quellen }),
    );

    // Initially MP3 is active – audio element should be present
    expect(container.querySelector("audio")).not.toBeNull();

    // Switch to Spotify tab
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]);

    // After switching: audio element should be gone, iframe should appear
    expect(container.querySelector("audio")).toBeNull();
    const iframe = screen.getByTitle(/Spotify/i);
    expect(iframe).toBeDefined();
  });
});
