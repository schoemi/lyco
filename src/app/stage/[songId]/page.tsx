"use client";

/**
 * StagePrompterPage — Prompter-Ansicht für einen einzelnen Song
 *
 * Anforderungen: 6.1–6.6, 7.1–7.3, 8.1–8.7, 9.1–9.6, 10.1–10.4, 11.1–11.3, 14.1–14.3
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { FlatLine } from "@/types/karaoke";
import type { StageSong } from "@/types/stage";
import { loadStageSettings, saveStageSettings } from "@/lib/stage/storage";
import { useStageData } from "@/lib/stage/use-stage-data";
import { useConfidenceHighlighting } from "@/lib/stage/use-confidence-highlighting";
import { useStageKeyboard } from "@/lib/stage/use-stage-keyboard";
import { useKaraokeSwipe } from "@/lib/karaoke/use-karaoke-swipe";
import { useAutoScroll } from "@/lib/karaoke/use-auto-scroll";
import { NextSongHint } from "@/components/stage/next-song-hint";
import { StageEinstellungsDialog } from "@/components/stage/stage-einstellungs-dialog";
import type { StageSettings } from "@/types/stage";

// ─── Pure logic functions (exported for testing) ─────────────────────────────

const SWIPE_THRESHOLD = 30;

/**
 * Computes swipe navigation direction from a vertical delta.
 * deltaY > threshold → "next" (swipe up)
 * deltaY < -threshold → "prev" (swipe down)
 * |deltaY| <= threshold → null
 */
export function computeSwipeDirection(
  deltaY: number,
): "next" | "prev" | null {
  if (deltaY > SWIPE_THRESHOLD) return "next";
  if (deltaY < -SWIPE_THRESHOLD) return "prev";
  return null;
}

/**
 * Computes the auto-scroll interval in milliseconds from a speed value (1–10 seconds).
 */
export function computeAutoScrollInterval(speed: number): number {
  return speed * 1000;
}

/**
 * Returns the strophe name for the active line, or null if not found.
 */
export function getStropheNameForLine(
  flatLines: FlatLine[],
  activeIndex: number,
  song: StageSong,
): string | null {
  const line = flatLines[activeIndex];
  if (!line) return null;
  const strophe = song.strophen.find((s) => s.id === line.stropheId);
  return strophe?.name ?? null;
}

/**
 * Returns true when the song has changed (songId differs from prevSongId).
 */
export function shouldShowSongInfo(
  songId: string,
  prevSongId: string | null,
): boolean {
  return prevSongId !== songId;
}

// ─── Flatten helper for StageSong ────────────────────────────────────────────

function flattenStageSong(song: StageSong): FlatLine[] {
  const sortedStrophen = [...song.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const flatLines: FlatLine[] = [];
  let globalIndex = 0;

  for (const strophe of sortedStrophen) {
    const sortedZeilen = [...strophe.zeilen].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const stropheLineCount = sortedZeilen.length;

    for (let i = 0; i < sortedZeilen.length; i++) {
      const zeile = sortedZeilen[i];
      flatLines.push({
        zeileId: zeile.id,
        text: zeile.text,
        rawText: zeile.text,
        stropheId: strophe.id,
        stropheName: strophe.name,
        globalIndex,
        indexInStrophe: i,
        stropheLineCount,
      });
      globalIndex++;
    }
  }

  return flatLines;
}

// ─── SongAnzeige for stage (renders all lines with confidence colors) ─────────

function StageSongAnzeige({
  song,
  flatLines,
  activeLineIndex,
  getLineColor,
}: {
  song: StageSong;
  flatLines: FlatLine[];
  activeLineIndex: number;
  getLineColor: (stropheId: string) => string;
}) {
  const activeLine = flatLines[activeLineIndex];
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    const activeEl = activeLine ? lineRefs.current.get(activeLine.zeileId) : null;
    if (!container || !activeEl) return;
    const containerHeight = container.clientHeight;
    const centerY = containerHeight / 2;
    const activeTop = (activeEl as HTMLElement).offsetTop;
    const activeHeight = (activeEl as HTMLElement).offsetHeight;
    const activeCenter = activeTop + activeHeight / 2;
    container.scrollTop = activeCenter - centerY;
  }, [activeLine]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden px-4">
      <div className="flex flex-col items-center gap-2">
        {flatLines.map((line) => {
          const isActive = line.zeileId === activeLine?.zeileId;
          return (
            <p
              key={line.zeileId}
              ref={(el) => {
                if (el) lineRefs.current.set(line.zeileId, el);
                else lineRefs.current.delete(line.zeileId);
              }}
              className={`text-center transition-all duration-300 ${
                isActive ? "text-2xl font-bold opacity-100" : "text-xl opacity-40"
              }`}
              style={{ color: getLineColor(line.stropheId) }}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function StagePrompterPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.songId as string;

  const { songs, sets, progress, isLoading, error } = useStageData();
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [settings, setSettings] = useState<StageSettings>(() => loadStageSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevSongIdRef = useRef<string | null>(null);
  const timecodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettings(loadStageSettings());
  }, []);

  const song = songs.get(songId) ?? null;

  const flatLines = useMemo(
    () => (song ? flattenStageSong(song) : []),
    [song],
  );

  const isLastLine = activeLineIndex >= flatLines.length - 1;

  const onAutoAdvance = useCallback(() => {
    setActiveLineIndex((prev) =>
      prev < flatLines.length - 1 ? prev + 1 : prev,
    );
  }, [flatLines.length]);

  const { isPlaying, play, toggle, pause } = useAutoScroll({
    speed: settings.scrollSpeed,
    isLastLine,
    onAdvance: onAutoAdvance,
  });

  // ─── Timecode-based scrolling ─────────────────────────────────────────────
  // When a song is loaded, schedule jumps to the correct line at each timecode.
  // "x Sekunden nach Wechsel auf den Song muss der Song an der Timecode-Marke sein"
  useEffect(() => {
    if (!song || flatLines.length === 0) return;

    // Clear any previous timers
    if (timecodeTimerRef.current) clearTimeout(timecodeTimerRef.current);

    // Build a list of { timecodeMs, lineIndex } for all strophes that have a timecode
    const timecodeJumps: { timecodeMs: number; lineIndex: number }[] = [];
    for (const strophe of song.strophen) {
      if (strophe.timecodeMs == null) continue;
      // Find the first flat line belonging to this strophe
      const lineIndex = flatLines.findIndex((l) => l.stropheId === strophe.id);
      if (lineIndex >= 0) {
        timecodeJumps.push({ timecodeMs: strophe.timecodeMs, lineIndex });
      }
    }

    // Sort by timecode ascending
    timecodeJumps.sort((a, b) => a.timecodeMs - b.timecodeMs);

    // Schedule each jump relative to song start
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const jump of timecodeJumps) {
      const delay = jump.timecodeMs; // ms after song start
      const t = setTimeout(() => {
        setActiveLineIndex(jump.lineIndex);
      }, delay);
      timers.push(t);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [song, flatLines]);

  // ─── Song change: reset line, start auto-scroll ──────────────────────────
  useEffect(() => {
    const isNewSong = prevSongIdRef.current !== songId;
    prevSongIdRef.current = songId;
    if (!isNewSong) return;

    setActiveLineIndex(0);
  }, [songId]);

  // Auto-scroll starts automatically when song data is ready
  useEffect(() => {
    if (flatLines.length > 0 && !isPlaying) {
      play();
    }
    // Only trigger on initial load of flatLines
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatLines.length > 0]);

  // Manual navigation pauses auto-scroll (Req 7.3)
  const onNext = useCallback(() => {
    setActiveLineIndex((prev) =>
      prev < flatLines.length - 1 ? prev + 1 : prev,
    );
    pause();
  }, [flatLines.length, pause]);

  const onPrev = useCallback(() => {
    setActiveLineIndex((prev) => (prev > 0 ? prev - 1 : prev));
    pause();
  }, [pause]);

  // Determine next song in setlist
  const nextSong = useMemo(() => {
    if (!song) return undefined;
    for (const set of sets) {
      const sorted = [...set.songs].sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = sorted.findIndex((s) => s.songId === songId);
      if (idx >= 0 && idx < sorted.length - 1) {
        return songs.get(sorted[idx + 1].songId) ?? null;
      }
    }
    return null;
  }, [sets, songs, songId, song]);

  const isLastSong = nextSong === null;
  const showNextSongHint =
    flatLines.length > 0 && activeLineIndex >= flatLines.length - 3;

  // Confidence highlighting (Req 8.1–8.7)
  const { getLineColor } = useConfidenceHighlighting(progress, settings);

  // Keyboard navigation (Req 9.1–9.6)
  useStageKeyboard({
    onNext,
    onPrev,
    onToggleAutoScroll: toggle,
    onNextSong: () => {
      if (nextSong) router.push(`/stage/${nextSong.id}`);
      else router.push("/stage");
    },
    onPrevSong: () => router.push("/stage"),
    onEscape: () => router.push("/stage"),
  });

  // Swipe navigation (Req 10.1–10.4)
  useKaraokeSwipe({ onNext, onPrev });

  // Settings change handler
  const handleSettingsChange = useCallback((partial: Partial<StageSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveStageSettings(updated);
      return updated;
    });
  }, []);

  // Active line text for aria-live region (Req 14.1)
  const activeLineText = flatLines[activeLineIndex]?.text ?? "";

  // ─── Render states ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/50 text-sm">Wird geladen…</p>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/50 text-sm">
          {error ?? "Song nicht gefunden"}
        </p>
      </div>
    );
  }

  if (flatLines.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/50 text-sm">Keine Texte vorhanden</p>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-black"
      style={{ fontSize: `${settings.fontSize}px` }}
    >
      {/* Full-song text display — always song mode */}
      <div className="flex-1 overflow-hidden">
        <StageSongAnzeige
          song={song}
          flatLines={flatLines}
          activeLineIndex={activeLineIndex}
          getLineColor={getLineColor}
        />
      </div>

      {/* aria-live region for screen readers (Req 14.1) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {activeLineText}
      </div>

      {/* Next song hint (Req 11.1–11.3) */}
      <NextSongHint
        nextSongTitle={isLastSong ? null : (nextSong?.titel ?? null)}
        visible={showNextSongHint}
      />

      {/* Settings button (Req 12.1) */}
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Stage-Einstellungen öffnen"
        className="fixed right-4 top-4 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Auto-scroll toggle button */}
      <button
        onClick={toggle}
        aria-label={isPlaying ? "Auto-Scroll pausieren" : "Auto-Scroll starten"}
        className="fixed left-4 top-4 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
      >
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Back button */}
      <button
        onClick={() => router.push("/stage")}
        aria-label="Zurück zur Setlist"
        className="fixed left-4 bottom-4 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Settings dialog */}
      <StageEinstellungsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
