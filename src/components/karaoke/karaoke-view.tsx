"use client";

import type { SongDetail } from "@/types/song";
import type { FlatLine, DisplayMode } from "@/types/karaoke";
import type { ReferenzDaten } from "@/types/vocal-trainer";
import { ZurueckButton } from "@/components/karaoke/zurueck-button";
import { StrophenTitel } from "@/components/karaoke/strophen-titel";
import { TextAnzeige } from "@/components/karaoke/text-anzeige";
import { SongInfo } from "@/components/karaoke/song-info";
import { NavigationsButtons } from "@/components/karaoke/navigations-buttons";
import { PlayPauseButton } from "@/components/karaoke/play-pause-button";
import { ModusUmschalter } from "@/components/karaoke/modus-umschalter";
import { AudioPlayButton } from "@/components/karaoke/audio-play-button";
import type { AudioPlayButtonHandle } from "@/components/karaoke/audio-play-button";
import { PitchDisplay } from "@/components/pitch-display/pitch-display";
import { aggregiereFramesZuBalken } from "@/lib/pitch-display/pitch-balken";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";

interface KaraokeViewProps {
  song: SongDetail;
  flatLines: FlatLine[];
  activeLineIndex: number;
  displayMode: DisplayMode;
  isAutoScrolling: boolean;
  scrollSpeed: number;
  activeAudioQuelleId: string | null;
  referenzDaten?: ReferenzDaten;
  pitchDisplayEnabled?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onNextStrophe: () => void;
  onPrevStrophe: () => void;
  onToggleAutoScroll: () => void;
  onModeChange: (mode: DisplayMode) => void;
  onOpenSettings: () => void;
  onBack: () => void;
  onAudioTimeUpdate?: (currentTimeMs: number) => void;
}

export const KaraokeView = forwardRef<AudioPlayButtonHandle, KaraokeViewProps>(
  function KaraokeView({
    song,
    flatLines,
    activeLineIndex,
    displayMode,
    isAutoScrolling,
    scrollSpeed,
    activeAudioQuelleId,
    referenzDaten,
    pitchDisplayEnabled,
    onNext,
    onPrev,
    onNextStrophe,
    onPrevStrophe,
    onToggleAutoScroll,
    onModeChange,
    onOpenSettings,
    onBack,
    onAudioTimeUpdate,
  }, ref) {
  const activeLine = flatLines[activeLineIndex];
  const isFirstLine = activeLineIndex === 0;
  const isLastLine = activeLineIndex === flatLines.length - 1;

  // --- Pitch display data ---
  const pitchBalken = useMemo(
    () => (referenzDaten ? aggregiereFramesZuBalken(referenzDaten.frames) : []),
    [referenzDaten],
  );
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Internal toggle state for pitch display, defaults to true when referenzDaten is available
  const [pitchToggle, setPitchToggle] = useState(!!referenzDaten);

  // Sync toggle default when referenzDaten availability changes
  useEffect(() => {
    setPitchToggle(!!referenzDaten);
  }, [referenzDaten]);

  // Wrap the parent onAudioTimeUpdate to also track currentTimeMs locally
  const handleAudioTimeUpdate = useCallback(
    (timeMs: number) => {
      setCurrentTimeMs(timeMs);
      onAudioTimeUpdate?.(timeMs);
    },
    [onAudioTimeUpdate],
  );

  // Whether to show the PitchDisplay — visible whenever referenzDaten exists
  const showPitchDisplay = !!referenzDaten;

  // Determine strophe boundaries
  const currentStropheId = activeLine?.stropheId;
  const isFirstStrophe = !flatLines.some(
    (l, i) => i < activeLineIndex && l.stropheId !== currentStropheId
  );
  const isLastStrophe = !flatLines.some(
    (l, i) => i > activeLineIndex && l.stropheId !== currentStropheId
  );

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: `linear-gradient(to bottom right, var(--karaoke-bg-from, #312e81), var(--karaoke-bg-via, #581c87), var(--karaoke-bg-to, #0f172a))`,
      }}
    >
      {/* Top bar: back button + strophe title */}
      <div className="relative flex items-center px-4 pt-4">
        <div className="absolute left-4">
          <ZurueckButton onBack={onBack} />
        </div>
        <div className="mx-auto transition-opacity duration-300">
          {activeLine && <StrophenTitel name={activeLine.stropheName} />}
        </div>
      </div>

      {/* Center: main text display area */}
      <div className="flex flex-1 flex-col overflow-hidden px-4 transition-all duration-300">
        {showPitchDisplay && (
          <div className="w-full px-2" style={{ height: '30vh', minHeight: 160 }}>
            <PitchDisplay
              balken={pitchBalken}
              currentTimeMs={currentTimeMs}
              isPlaying={isAudioPlaying}
              windowDurationMs={25000}
              beatPositionenMs={
                song.beatErgebnis?.beatPositionenMs && song.beatErgebnis.offsetMs
                  ? song.beatErgebnis.beatPositionenMs.map((ms) => Math.max(0, ms + song.beatErgebnis!.offsetMs))
                  : song.beatErgebnis?.beatPositionenMs
              }
              taktZaehler={song.beatErgebnis?.taktZaehler}
            />
          </div>
        )}
        <div className="flex flex-1 w-full flex-col items-center justify-center">
          <TextAnzeige
            flatLines={flatLines}
            activeLineIndex={activeLineIndex}
            displayMode={displayMode}
            song={song}
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-2 px-4 pb-4">
        {/* Song info – above mode switcher, compact */}
        <SongInfo titel={song.titel} kuenstler={song.kuenstler} compact />

        {/* Mode switcher + Pitch toggle */}
        <div className="flex items-center gap-2 transition-opacity duration-200">
          <ModusUmschalter activeMode={displayMode} onChange={onModeChange} />
          {!!referenzDaten && (
            <button
              onClick={() => setPitchToggle((prev) => !prev)}
              aria-label={pitchToggle ? "Pitch-Anzeige ausschalten" : "Pitch-Anzeige einschalten"}
              aria-pressed={pitchToggle}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                pitchToggle
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "bg-white/10 text-white/80 hover:text-white"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 20h20" />
                <path d="M5 20v-8" />
                <path d="M9 20V8" />
                <path d="M13 20v-5" />
                <path d="M17 20V4" />
              </svg>
            </button>
          )}
        </div>

        {/* Controls row: Audio | AutoScroll | Navigation */}
        <div className="flex items-center justify-center gap-3">
          {/* Audio player button (MP3 only) */}
          <AudioPlayButton ref={ref} audioQuellen={song.audioQuellen} activeQuelleId={activeAudioQuelleId} onTimeUpdate={handleAudioTimeUpdate} onPlayStateChange={setIsAudioPlaying} />

          <PlayPauseButton
            isPlaying={isAutoScrolling}
            onToggle={onToggleAutoScroll}
          />

          <NavigationsButtons
            onNext={onNext}
            onPrev={onPrev}
            onNextStrophe={onNextStrophe}
            onPrevStrophe={onPrevStrophe}
            isFirstLine={isFirstLine}
            isLastLine={isLastLine}
            isFirstStrophe={isFirstStrophe}
            isLastStrophe={isLastStrophe}
          />
        </div>
      </div>

      {/* Settings gear – fixed bottom right corner of screen */}
      <button
        onClick={onOpenSettings}
        aria-label="Einstellungen öffnen"
        className="absolute bottom-4 right-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white active:bg-white/20"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Aria live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {activeLine?.text}
      </div>
    </div>
  );
  }
);