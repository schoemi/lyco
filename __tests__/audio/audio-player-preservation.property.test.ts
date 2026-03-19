/**
 * @vitest-environment jsdom
 */

/**
 * Preservation Property-Tests — Audio-Player-Bugs
 *
 * Diese Tests werden VOR der Implementierung des Fixes geschrieben und sollen
 * auf dem UNFIXIERTEN Code BESTEHEN. Sie erfassen das Baseline-Verhalten, das
 * nach dem Fix unverändert bleiben muss (keine Regressionen).
 *
 * Getestete Preservation-Anforderungen:
 * - 3.1: SongEditForm rendert Metadaten-Felder korrekt im editing-Modus
 * - 3.2: SongTextEditor wird im editingText-Modus korrekt angezeigt
 * - 3.3: Externe Audio-Quellen (Spotify, YouTube, Apple Music) als Embed korrekt
 * - 3.4: Externe MP3-URLs werden korrekt geladen
 * - 3.5: Freigabe-Ansicht zeigt keine Bearbeitungsoptionen
 * - 3.6: Quellen-Umschalter bei mehreren Audio-Quellen funktioniert
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */

import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import SongEditForm from "@/components/songs/song-edit-form";
import SongTextEditor from "@/components/songs/song-text-editor";
import { AudioPlayer } from "@/components/songs/audio-player";
import { SharedAudioProvider } from "@/components/songs/shared-audio-provider";
import type { SongDetail, StropheDetail, ZeileDetail } from "@/types/song";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
});

// ── Arbitraries ──

/** Arbitrary non-empty trimmed string */
const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/\s+/g, " ").trim() || "a");

/** Arbitrary optional string (string | null) */
const arbOptionalString = fc.option(arbNonEmptyString, { nil: null });

/** Arbitrary emotion tags array */
const arbEmotionsTags = fc.array(arbNonEmptyString, { minLength: 0, maxLength: 5 });

/** Arbitrary ZeileDetail */
const arbZeile: fc.Arbitrary<ZeileDetail> = fc.record({
  id: fc.uuid(),
  text: arbNonEmptyString,
  uebersetzung: arbOptionalString,
  orderIndex: fc.nat({ max: 100 }),
  markups: fc.constant([]),
});

/** Arbitrary StropheDetail */
const arbStrophe: fc.Arbitrary<StropheDetail> = fc.record({
  id: fc.uuid(),
  name: arbNonEmptyString,
  orderIndex: fc.nat({ max: 50 }),
  progress: fc.integer({ min: 0, max: 100 }),
  notiz: arbOptionalString,
  analyse: arbOptionalString,
  zeilen: fc.array(arbZeile, { minLength: 1, maxLength: 5 }),
  markups: fc.constant([]),
});

/** Arbitrary AudioQuelleResponse for external embed types */
const arbEmbedTyp = fc.constantFrom("SPOTIFY" as const, "YOUTUBE" as const, "APPLE_MUSIC" as const);

const arbSpotifyUrl = fc.uuid().map((id) => `https://open.spotify.com/track/${id}`);
const arbYoutubeUrl = fc.uuid().map((id) => `https://www.youtube.com/watch?v=${id}`);
const arbAppleMusicUrl = fc.uuid().map((id) => `https://music.apple.com/us/album/${id}`);

function arbUrlForTyp(typ: "SPOTIFY" | "YOUTUBE" | "APPLE_MUSIC"): fc.Arbitrary<string> {
  switch (typ) {
    case "SPOTIFY": return arbSpotifyUrl;
    case "YOUTUBE": return arbYoutubeUrl;
    case "APPLE_MUSIC": return arbAppleMusicUrl;
  }
}

const arbEmbedQuelle: fc.Arbitrary<AudioQuelleResponse> = arbEmbedTyp.chain((typ) =>
  fc.record({
    id: fc.uuid(),
    url: arbUrlForTyp(typ),
    typ: fc.constant(typ),
    label: arbNonEmptyString,
    orderIndex: fc.nat({ max: 10 }),
    rolle: fc.constant("STANDARD" as const),
  }),
);

/** Arbitrary external MP3 URL (not /api/uploads/) */
const arbExternalMp3Url = fc.webUrl().map((u) => `${u}/song.mp3`);

const arbExternalMp3Quelle: fc.Arbitrary<AudioQuelleResponse> = fc.record({
  id: fc.uuid(),
  url: arbExternalMp3Url,
  typ: fc.constant("MP3" as const),
  label: arbNonEmptyString,
  orderIndex: fc.nat({ max: 10 }),
  rolle: fc.constant("STANDARD" as const),
});

/** Arbitrary SongDetail for editing mode tests */
const arbSongDetail: fc.Arbitrary<SongDetail> = fc.record({
  id: fc.uuid(),
  titel: arbNonEmptyString,
  kuenstler: arbOptionalString,
  sprache: arbOptionalString,
  emotionsTags: arbEmotionsTags,
  coverUrl: arbOptionalString,
  progress: fc.integer({ min: 0, max: 100 }),
  sessionCount: fc.nat({ max: 1000 }),
  analyse: arbOptionalString,
  coachTipp: arbOptionalString,
  strophen: fc.array(arbStrophe, { minLength: 1, maxLength: 3 }),
  audioQuellen: fc.constant([] as AudioQuelleResponse[]),
  sets: fc.constant([] as { id: string; name: string }[]),
  istFreigabe: fc.constant(false),
  eigentuemerName: fc.constant(undefined),
});

// ── Property 1: SongEditForm rendert Metadaten-Felder im editing-Modus ──
// **Validates: Requirements 3.1**

describe("Preservation 3.1: SongEditForm rendert Metadaten-Felder korrekt", () => {
  it("für beliebige Song-Zustände mit editing=true: SongEditForm zeigt Titel, Künstler, Sprache, Emotions-Tags", () => {
    fc.assert(
      fc.property(arbSongDetail, (song) => {
        cleanup();
        render(
          React.createElement(SongEditForm, {
            song,
            onSaved: () => {},
            onCancel: () => {},
          }),
        );

        // Titel field should be present with the song's title value
        const titelInput = screen.getByLabelText("Titel") as HTMLInputElement;
        expect(titelInput).toBeDefined();
        expect(titelInput.value).toBe(song.titel);

        // Künstler field should be present
        const kuenstlerInput = screen.getByLabelText("Künstler") as HTMLInputElement;
        expect(kuenstlerInput).toBeDefined();
        expect(kuenstlerInput.value).toBe(song.kuenstler ?? "");

        // Sprache field should be present
        const spracheInput = screen.getByLabelText("Sprache") as HTMLInputElement;
        expect(spracheInput).toBeDefined();
        expect(spracheInput.value).toBe(song.sprache ?? "");

        // Emotions-Tags field should be present
        const tagsInput = screen.getByLabelText(/Emotions-Tags/i) as HTMLInputElement;
        expect(tagsInput).toBeDefined();
        expect(tagsInput.value).toBe(song.emotionsTags.join(", "));
      }),
      { numRuns: 20 },
    );
  });
});

// ── Property 2: SongTextEditor wird im editingText-Modus korrekt angezeigt ──
// **Validates: Requirements 3.2**

describe("Preservation 3.2: SongTextEditor wird im editingText-Modus korrekt angezeigt", () => {
  it("für beliebige Song-Zustände mit editingText=true: SongTextEditor wird gerendert mit Textarea und Buttons", () => {
    fc.assert(
      fc.property(arbSongDetail, (song) => {
        cleanup();
        render(
          React.createElement(SongTextEditor, {
            song,
            onSaved: () => {},
            onCancel: () => {},
          }),
        );

        // Textarea for editing song text should be present
        const textarea = screen.getByLabelText("Songtext bearbeiten") as HTMLTextAreaElement;
        expect(textarea).toBeDefined();
        expect(textarea.tagName).toBe("TEXTAREA");

        // Save and Cancel buttons should be present
        expect(screen.getByText("Speichern")).toBeDefined();
        expect(screen.getByText("Abbrechen")).toBeDefined();

        // Warning banner should be present
        const alerts = screen.getAllByRole("alert");
        expect(alerts.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 },
    );
  });
});

// ── Property 3: Externe Audio-Quellen (Spotify, YouTube, Apple Music) als Embed ──
// **Validates: Requirements 3.3**

describe("Preservation 3.3: Externe Audio-Quellen werden als Embed korrekt angezeigt", () => {
  it("für beliebige Audio-Quellen mit Typ SPOTIFY/YOUTUBE/APPLE_MUSIC: Embed-iframe wird gerendert", () => {
    fc.assert(
      fc.property(arbEmbedQuelle, (quelle) => {
        cleanup();
        const { container } = render(
          React.createElement(
            SharedAudioProvider,
            { audioQuellen: [quelle] },
            React.createElement(AudioPlayer, { audioQuellen: [quelle] }),
          ),
        );

        // An iframe should be rendered for embed types
        const iframe = container.querySelector("iframe");
        expect(iframe).not.toBeNull();
        expect(iframe!.getAttribute("src")).toBeTruthy();

        // The iframe title should contain the type name
        const title = iframe!.getAttribute("title") ?? "";
        if (quelle.typ === "SPOTIFY") {
          expect(title).toContain("Spotify");
        } else if (quelle.typ === "YOUTUBE") {
          expect(title).toContain("YouTube");
        } else if (quelle.typ === "APPLE_MUSIC") {
          expect(title).toContain("Apple Music");
        }

        // No <audio> element should be rendered for embed types
        const audioEl = container.querySelector("audio");
        expect(audioEl).toBeNull();
      }),
      { numRuns: 30 },
    );
  });
});

// ── Property 4: Externe MP3-URLs werden korrekt geladen ──
// **Validates: Requirements 3.4**

describe("Preservation 3.4: Externe MP3-URLs werden korrekt geladen", () => {
  it("für beliebige Audio-Quellen mit externer MP3-URL: Audio-Element wird mit korrekter src gerendert", () => {
    fc.assert(
      fc.property(arbExternalMp3Quelle, (quelle) => {
        cleanup();
        const { container } = render(
          React.createElement(
            SharedAudioProvider,
            { audioQuellen: [quelle] },
            React.createElement(AudioPlayer, { audioQuellen: [quelle] }),
          ),
        );

        // An <audio> element should be rendered for MP3 type
        const audioEl = container.querySelector("audio");
        expect(audioEl).not.toBeNull();
        expect(audioEl!.getAttribute("src")).toBe(quelle.url);

        // Play/Pause button should be present
        const playBtn = screen.getByLabelText("Abspielen");
        expect(playBtn).toBeDefined();

        // No iframe should be rendered for MP3 type
        const iframe = container.querySelector("iframe");
        expect(iframe).toBeNull();
      }),
      { numRuns: 30 },
    );
  });
});


// ── Property 5: Freigabe-Ansicht zeigt keine Bearbeitungsoptionen ──
// **Validates: Requirements 3.5**

describe("Preservation 3.5: Freigabe-Ansicht zeigt keine Bearbeitungsoptionen", () => {
  it("für beliebige Song-Zustände mit istFreigabe=true: Seite enthält keine Bearbeitungs-Buttons", () => {
    // We use source-code analysis to verify that the page.tsx guards editing
    // controls behind `!istFreigabe`. This is a structural preservation property.
    const fs = require("fs");
    const path = require("path");
    const pageSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/(main)/songs/[id]/page.tsx"),
      "utf-8",
    );

    fc.assert(
      fc.property(fc.constant(true), () => {
        // Strategy: Find JSX usages (not imports) of editing components and verify
        // they are guarded by `!istFreigabe`. We search for `<ComponentName` to
        // find JSX usage, and look at a generous context window before each.

        // Helper: find JSX usage index (skip import statements at top of file)
        const returnIdx = pageSource.indexOf("return (");
        expect(returnIdx).toBeGreaterThan(-1);
        const jsxPart = pageSource.slice(returnIdx);

        // The SongActionMenu must be guarded by `!istFreigabe`
        const actionMenuIdx = jsxPart.indexOf("<SongActionMenu");
        expect(actionMenuIdx).toBeGreaterThan(-1);
        const actionMenuContext = jsxPart.slice(Math.max(0, actionMenuIdx - 1500), actionMenuIdx);
        expect(actionMenuContext).toContain("!istFreigabe");

        // The SongEditForm must also be guarded by `!istFreigabe`
        const editFormIdx = jsxPart.indexOf("<SongEditForm");
        expect(editFormIdx).toBeGreaterThan(-1);
        const editFormContext = jsxPart.slice(Math.max(0, editFormIdx - 500), editFormIdx);
        expect(editFormContext).toContain("!istFreigabe");

        // The SongTextEditor must also be guarded by `!istFreigabe`
        const textEditorIdx = jsxPart.indexOf("<SongTextEditor");
        expect(textEditorIdx).toBeGreaterThan(-1);
        const textEditorContext = jsxPart.slice(Math.max(0, textEditorIdx - 500), textEditorIdx);
        expect(textEditorContext).toContain("!istFreigabe");

        // The "Teilen" button must be guarded by `!istFreigabe`
        const teilenIdx = jsxPart.indexOf("Teilen");
        expect(teilenIdx).toBeGreaterThan(-1);
        const teilenContext = jsxPart.slice(Math.max(0, teilenIdx - 500), teilenIdx);
        expect(teilenContext).toContain("!istFreigabe");
      }),
      { numRuns: 1 },
    );
  });
});

// ── Property 6: Quellen-Umschalter bei mehreren Audio-Quellen ──
// **Validates: Requirements 3.6**

describe("Preservation 3.6: Quellen-Umschalter bei mehreren Audio-Quellen funktioniert", () => {
  /** Arbitrary list of 2-4 audio sources with mixed types */
  const arbMultipleQuellen: fc.Arbitrary<AudioQuelleResponse[]> = fc
    .tuple(arbExternalMp3Quelle, arbEmbedQuelle)
    .chain(([mp3, embed]) =>
      fc.constant([
        { ...mp3, orderIndex: 0 },
        { ...embed, orderIndex: 1, id: embed.id + "-2" },
      ]),
    );

  it("für beliebige Kombinationen mehrerer Audio-Quellen: Quellen-Umschalter-Tabs werden gerendert", () => {
    fc.assert(
      fc.property(arbMultipleQuellen, (quellen) => {
        cleanup();
        render(
          React.createElement(
            SharedAudioProvider,
            { audioQuellen: quellen },
            React.createElement(AudioPlayer, { audioQuellen: quellen }),
          ),
        );

        // Source switcher tabs should be rendered
        const tabs = screen.getAllByRole("tab");
        expect(tabs.length).toBe(quellen.length);

        // First tab should be selected by default
        expect(tabs[0].getAttribute("aria-selected")).toBe("true");

        // Each tab should show the label or type
        quellen.forEach((q, i) => {
          const tabText = tabs[i].textContent ?? "";
          expect(tabText).toBe(q.label || q.typ);
        });
      }),
      { numRuns: 20 },
    );
  });
});
