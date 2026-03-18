"use client";

import type { SongDetail } from "@/types/song";
import type { FlatLine, DisplayMode } from "@/types/karaoke";
import { ZurueckButton } from "@/components/karaoke/zurueck-button";
import { StrophenTitel } from "@/components/karaoke/strophen-titel";
import { TextAnzeige } from "@/components/karaoke/text-anzeige";
import { SongInfo } from "@/components/karaoke/song-info";
import { NavigationsButtons } from "@/components/karaoke/navigations-buttons";
import { PlayPauseButton } from "@/components/karaoke/play-pause-button";
import { ModusUmschalter } from "@/components/karaoke/modus-umschalter";

interface KaraokeViewProps {
  song: SongDetail;
  flatLines: FlatLine[];
  activeLineIndex: number;
  displayMode: DisplayMode;
  isAutoScrolling: boolean;
  scrollSpeed: number;
  onNext: () => void;
  onPrev: () => void;
  onToggleAutoScroll: () => void;
  onModeChange: (mode: DisplayMode) => void;
  onOpenSettings: () => void;
  onBack: () => void;
}

export function KaraokeView({
  song,
  flatLines,
  activeLineIndex,
  displayMode,
  isAutoScrolling,
  scrollSpeed,
  onNext,
  onPrev,
  onToggleAutoScroll,
  onModeChange,
  onOpenSettings,
  onBack,
}: KaraokeViewProps) {
  const activeLine = flatLines[activeLineIndex];
  const isFirstLine = activeLineIndex === 0;
  const isLastLine = activeLineIndex === flatLines.length - 1;

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
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4 transition-all duration-300">
        <TextAnzeige
          flatLines={flatLines}
          activeLineIndex={activeLineIndex}
          displayMode={displayMode}
          song={song}
        />
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-2 px-4 pb-4">
        {/* Song info – above mode switcher, compact */}
        <SongInfo titel={song.titel} kuenstler={song.kuenstler} compact />

        {/* Mode switcher */}
        <div className="transition-opacity duration-200">
          <ModusUmschalter activeMode={displayMode} onChange={onModeChange} />
        </div>

        {/* Controls row: Gear | Play | Prev Next */}
        <div className="flex w-full items-center justify-center gap-3">
          {/* Settings gear button */}
          <button
            onClick={onOpenSettings}
            aria-label="Einstellungen öffnen"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 active:bg-white/20"
          >
            <svg
              width="24"
              height="24"
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

          <PlayPauseButton
            isPlaying={isAutoScrolling}
            onToggle={onToggleAutoScroll}
          />

          <NavigationsButtons
            onNext={onNext}
            onPrev={onPrev}
            isFirstLine={isFirstLine}
            isLastLine={isLastLine}
          />
        </div>
      </div>

      {/* Aria live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {activeLine?.text}
      </div>
    </div>
  );
}
