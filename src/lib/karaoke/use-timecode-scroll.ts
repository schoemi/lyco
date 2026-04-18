"use client";

import { useEffect, useRef, useState } from "react";
import type { FlatLine } from "@/types/karaoke";
import type { StropheDetail } from "@/types/song";

export interface StropheTimecode {
  stropheId: string;
  timecodeMs: number;
  /** Index of the first FlatLine belonging to this strophe */
  firstLineIndex: number;
  /** Number of lines in this strophe */
  lineCount: number;
}

/**
 * Extracts sorted strophe timecodes from song data.
 * Only strophes with a TIMECODE markup (ziel=STROPHE) are included.
 */
export function buildStropheTimecodes(
  strophen: StropheDetail[],
  flatLines: FlatLine[],
): StropheTimecode[] {
  const result: StropheTimecode[] = [];

  for (const strophe of strophen) {
    const timecodeMarkup = strophe.markups.find(
      (m) => m.typ === "TIMECODE" && m.ziel === "STROPHE" && m.timecodeMs != null,
    );
    if (!timecodeMarkup || timecodeMarkup.timecodeMs == null) continue;

    const firstLineIndex = flatLines.findIndex(
      (l) => l.stropheId === strophe.id,
    );
    if (firstLineIndex < 0) continue;

    const lineCount = flatLines.filter(
      (l) => l.stropheId === strophe.id,
    ).length;

    result.push({
      stropheId: strophe.id,
      timecodeMs: timecodeMarkup.timecodeMs,
      firstLineIndex,
      lineCount,
    });
  }

  // Sort by timecode ascending
  result.sort((a, b) => a.timecodeMs - b.timecodeMs);
  return result;
}

/**
 * Given the current audio position in ms, determines which FlatLine index
 * should be active based on strophe timecodes.
 *
 * Within a strophe, lines are distributed evenly across the time until the
 * next strophe starts (or until `durationMs` for the last strophe).
 *
 * Returns -1 if no timecodes are available or playback hasn't reached the
 * first timecode yet.
 */
export function getLineIndexForTime(
  currentMs: number,
  timecodes: StropheTimecode[],
  durationMs: number,
): number {
  if (timecodes.length === 0) return -1;

  // Before the first timecode → not yet started
  if (currentMs < timecodes[0].timecodeMs) return -1;

  // Find which strophe we're in
  let activeIdx = 0;
  for (let i = timecodes.length - 1; i >= 0; i--) {
    if (currentMs >= timecodes[i].timecodeMs) {
      activeIdx = i;
      break;
    }
  }

  const active = timecodes[activeIdx];
  const nextTimecodeMs =
    activeIdx < timecodes.length - 1
      ? timecodes[activeIdx + 1].timecodeMs
      : durationMs > 0
        ? durationMs
        : active.timecodeMs + active.lineCount * 3000; // fallback: 3s per line

  // How far into this strophe are we? (0..1)
  const stropheDuration = nextTimecodeMs - active.timecodeMs;
  if (stropheDuration <= 0) return active.firstLineIndex;

  const elapsed = currentMs - active.timecodeMs;
  const progress = Math.min(elapsed / stropheDuration, 1);

  // Map progress to line index within the strophe
  const lineOffset = Math.min(
    Math.floor(progress * active.lineCount),
    active.lineCount - 1,
  );

  return active.firstLineIndex + lineOffset;
}

export interface UseTimecodeScrollOptions {
  flatLines: FlatLine[];
  strophen: StropheDetail[];
  /** Current audio playback position in ms (0 when not playing) */
  currentTimeMs: number;
  /** Total audio duration in ms */
  durationMs: number;
  /** Whether audio is currently playing */
  isAudioPlaying: boolean;
  /** Callback to set the active line index */
  onLineChange: (index: number) => void;
}

/**
 * Hook that synchronizes the active line with audio playback position
 * based on strophe timecodes. Only drives scrolling while audio is playing
 * and timecodes are available.
 *
 * Returns `isActive` — true when timecode-based scrolling is driving the
 * line position (audio playing + timecodes present).
 */
export function useTimecodeScroll(
  options: UseTimecodeScrollOptions,
): { isActive: boolean } {
  const {
    flatLines,
    strophen,
    currentTimeMs,
    durationMs,
    isAudioPlaying,
    onLineChange,
  } = options;

  const onLineChangeRef = useRef(onLineChange);
  useEffect(() => {
    onLineChangeRef.current = onLineChange;
  }, [onLineChange]);

  const timecodesRef = useRef<StropheTimecode[]>([]);

  const [hasTimecodes, setHasTimecodes] = useState(false);

  // Rebuild timecodes when song data changes
  useEffect(() => {
    timecodesRef.current = buildStropheTimecodes(strophen, flatLines);
    setHasTimecodes(timecodesRef.current.length > 0);
  }, [strophen, flatLines]);

  const isActive = isAudioPlaying && hasTimecodes;

  // Update active line based on audio position
  useEffect(() => {
    if (!isActive) return;

    const lineIndex = getLineIndexForTime(
      currentTimeMs,
      timecodesRef.current,
      durationMs,
    );
    if (lineIndex >= 0) {
      onLineChangeRef.current(lineIndex);
    }
  }, [currentTimeMs, durationMs, isActive]);

  return { isActive };
}
