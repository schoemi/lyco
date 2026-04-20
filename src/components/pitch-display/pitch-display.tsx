"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PitchBalken } from "@/lib/pitch-display/pitch-balken";
import type { AnnotationsBalken } from "@/lib/pitch-display/annotations-aufbereitung";
import {
  berechneViewport,
  filterSichtbareBalken,
  berechneSvgX,
  berechneSvgY,
  berechneMidiBereich,
} from "@/lib/pitch-display/pitch-coordinates";

/** Note names for MIDI values (C, C#, D, …). Only naturals shown on scale. */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Returns the note name with octave for a MIDI value, e.g. "C3", "D#4". */
function midiToNoteName(midi: number): string {
  const noteIndex = Math.round(midi) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/** Returns true if the MIDI value corresponds to a natural note (no sharp/flat). */
function isNatural(midi: number): boolean {
  const noteIndex = Math.round(midi) % 12;
  // Natural notes: C=0, D=2, E=4, F=5, G=7, A=9, B=11
  return [0, 2, 4, 5, 7, 9, 11].includes(noteIndex);
}

/** Annotation bar with assigned lane index for stacking. */
export interface AnnotationMitLane extends AnnotationsBalken {
  lane: number;
}

/**
 * Assigns lanes to annotation bars using a greedy algorithm.
 * Each bar is placed in the first lane where it doesn't overlap with any existing bar.
 * Bars are processed in order (assumed sorted by startMs from erzeugeAnnotationsBalken).
 */
export function weiseLanesZu(annotationen: AnnotationsBalken[]): AnnotationMitLane[] {
  if (annotationen.length === 0) return [];

  // Track the end time of the last bar placed in each lane
  const laneEnds: number[] = [];
  const result: AnnotationMitLane[] = [];

  for (const bar of annotationen) {
    let assignedLane = -1;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] <= bar.startMs) {
        assignedLane = lane;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[assignedLane] = bar.endMs;
    result.push({ ...bar, lane: assignedLane });
  }

  return result;
}

interface PitchDisplayProps {
  /** Array of aggregated pitch bars to display. */
  balken: PitchBalken[];
  /** Current playback position in milliseconds. */
  currentTimeMs: number;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Height of the display in pixels (80–300, default 200). */
  height?: number;
  /** Duration of the visible time window in milliseconds (10000–30000, default 25000). */
  windowDurationMs?: number;
  /** Optional beat positions in milliseconds for beat marker visualization. */
  beatPositionenMs?: number[];
  /** Beats per measure (e.g. 4 for 4/4 time). Used to draw measure lines and count measures. */
  taktZaehler?: number;
  /** Optional annotation bars for instrumental/comment sections. */
  annotationen?: AnnotationsBalken[];
}

/** Left margin for the note-name scale in pixels. */
const SCALE_MARGIN = 36;
/** Vertical padding inside the SVG plot area. */
const PADDING = 8;
/** Height of each pitch bar in pixels. */
const BAR_HEIGHT = 10;
/** Border radius for pitch bars. */
const BAR_RADIUS = 4;
/** Fill color for pitch bars. */
const BAR_FILL = "rgba(139, 92, 246, 0.7)";
/** How often (ms) the aria-live region announces the current time. */
const ANNOUNCE_INTERVAL_MS = 5000;
/** Keyboard viewport shift amount in ms. */
const KEYBOARD_SHIFT_MS = 2000;

/** Height per annotation lane in pixels (bar 16px + 6px spacing). */
const ANNOTATION_LANE_HEIGHT = 22;
/** Height of each annotation bar in pixels. */
const ANNOTATION_BAR_HEIGHT = 16;
/** Border radius for annotation bars. */
const ANNOTATION_BAR_RADIUS = 4;
/** Spacing between pitch area and annotation zone. */
const ANNOTATION_ZONE_GAP = 4;
/** Fill color for instrumental annotation bars. */
const ANNOTATION_COLOR_INSTRUMENTAL = "rgba(56, 189, 248, 0.6)";
/** Fill color for kommentar annotation bars. */
const ANNOTATION_COLOR_KOMMENTAR = "rgba(251, 191, 36, 0.6)";
/** Font size for annotation text in pixels. */
const ANNOTATION_FONT_SIZE = 10;
/** Average character width heuristic at ANNOTATION_FONT_SIZE. */
const ANNOTATION_CHAR_WIDTH = 6.5;
/** Horizontal padding inside annotation text or speech bubble. */
const ANNOTATION_TEXT_PADDING = 6;
/** Height of the speech bubble rectangle. */
const SPEECH_BUBBLE_HEIGHT = 18;
/** Height of the speech bubble triangle pointer. */
const SPEECH_BUBBLE_TRIANGLE_HEIGHT = 4;
/** Gap between speech bubble and bar top. */
const SPEECH_BUBBLE_GAP = 2;

/**
 * Estimates the rendered width of annotation text using a character count heuristic.
 * Returns the estimated width including horizontal padding.
 */
export function schaetzeTextBreite(text: string): number {
  return text.length * ANNOTATION_CHAR_WIDTH + ANNOTATION_TEXT_PADDING * 2;
}

/**
 * SVG-based pitch visualization component.
 * Renders horizontal pitch bars, a playback cursor, guide lines, and a note-name scale.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5,
 *               4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5,
 *               9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4
 */
export function PitchDisplay({
  balken,
  currentTimeMs,
  isPlaying,
  height: rawHeight,
  windowDurationMs: rawWindowDurationMs = 25000,
  beatPositionenMs,
  taktZaehler = 4,
  annotationen,
}: PitchDisplayProps) {
  // Clamp window duration to valid range
  const windowDurationMs = Math.max(10000, Math.min(30000, rawWindowDurationMs));

  // --- State for manual viewport offset (keyboard navigation) ---
  const [manualOffsetMs, setManualOffsetMs] = useState(0);

  // Reset manual offset when playback starts
  useEffect(() => {
    if (isPlaying) {
      setManualOffsetMs(0);
    }
  }, [isPlaying]);

  // --- Ref for the SVG container to measure width and height ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(800);
  const [measuredHeight, setMeasuredHeight] = useState(rawHeight ?? 200);

  // Height: use prop if provided, otherwise use measured container height
  const height = rawHeight != null ? Math.max(80, Math.min(400, rawHeight)) : Math.max(80, measuredHeight);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgWidth(entry.contentRect.width);
        if (rawHeight == null) {
          setMeasuredHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rawHeight]);

  // --- Cursor animation via requestAnimationFrame ---
  const [animatedTimeMs, setAnimatedTimeMs] = useState(currentTimeMs);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(currentTimeMs);

  // Keep lastTimeRef in sync with prop
  useEffect(() => {
    lastTimeRef.current = currentTimeMs;
  }, [currentTimeMs]);

  useEffect(() => {
    if (!isPlaying) {
      setAnimatedTimeMs(currentTimeMs);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let lastRafTimestamp: number | null = null;
    let localTimeMs = currentTimeMs;

    function animate(rafTimestamp: number) {
      if (lastRafTimestamp !== null) {
        const delta = rafTimestamp - lastRafTimestamp;
        localTimeMs += delta;
      }
      // Snap to prop value when it updates significantly
      const propTime = lastTimeRef.current;
      if (Math.abs(localTimeMs - propTime) > 500) {
        localTimeMs = propTime;
      }
      lastRafTimestamp = rafTimestamp;
      setAnimatedTimeMs(localTimeMs);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, currentTimeMs]);

  // --- Compute the effective time for viewport positioning ---
  const effectiveTimeMs = animatedTimeMs + manualOffsetMs;

  // --- Compute MIDI range across ALL bars (stable, not just visible) ---
  const midiBereich = useMemo(() => berechneMidiBereich(balken), [balken]);

  // Use exact MIDI range — no extra padding, bars fill the full vertical space
  const midiMin = midiBereich.min;
  const midiMax = midiBereich.max;

  // --- Compute viewport and visible bars ---
  const plotWidth = svgWidth - SCALE_MARGIN;

  const viewport = useMemo(
    () => berechneViewport(effectiveTimeMs, windowDurationMs),
    [effectiveTimeMs, windowDurationMs],
  );

  const sichtbareBalken = useMemo(
    () => filterSichtbareBalken(balken, viewport),
    [balken, viewport],
  );

  // --- Annotation viewport filtering (reuse same overlap pattern) ---
  const sichtbareAnnotationen = useMemo(() => {
    if (!annotationen || annotationen.length === 0) return [];
    return annotationen.filter(
      (a) => a.endMs >= viewport.startMs && a.startMs <= viewport.endMs,
    );
  }, [annotationen, viewport]);

  // --- Lane assignment for overlapping annotation bars (greedy algorithm) ---
  const annotationenMitLane = useMemo(() => {
    return weiseLanesZu(sichtbareAnnotationen);
  }, [sichtbareAnnotationen]);

  const anzahlLanes = useMemo(() => {
    if (annotationenMitLane.length === 0) return 0;
    return Math.max(...annotationenMitLane.map((a) => a.lane)) + 1;
  }, [annotationenMitLane]);

  // --- Compute annotation zone height ---
  const annotationZoneHeight = anzahlLanes > 0
    ? ANNOTATION_ZONE_GAP + anzahlLanes * ANNOTATION_LANE_HEIGHT
    : 0;

  // --- Total SVG height: pitch area + annotation zone ---
  const totalSvgHeight = height + annotationZoneHeight;

  // --- Compute guide lines (natural notes within MIDI range) ---
  const guideNotes = useMemo(() => {
    if (midiMin === 0 && midiMax === 0) return [];
    const notes: { midi: number; name: string }[] = [];
    const start = Math.floor(midiMin);
    const end = Math.ceil(midiMax);
    for (let m = start; m <= end; m++) {
      if (isNatural(m)) {
        notes.push({ midi: m, name: midiToNoteName(m) });
      }
    }
    return notes;
  }, [midiMin, midiMax]);

  // --- Compute SVG elements ---
  const barRects = useMemo(() => {
    return sichtbareBalken.map((b, i) => {
      const x = SCALE_MARGIN + berechneSvgX(b.startMs, viewport, plotWidth);
      const xEnd = SCALE_MARGIN + berechneSvgX(b.endMs, viewport, plotWidth);
      const w = Math.max(xEnd - x, 2); // minimum 2px width
      const y = berechneSvgY(b.midiValue, midiMin, midiMax, height, PADDING) - BAR_HEIGHT / 2;
      return { key: i, x, y, width: w };
    });
  }, [sichtbareBalken, viewport, plotWidth, midiMin, midiMax, height]);

  // --- Compute annotation bar SVG elements ---
  const annotationRects = useMemo(() => {
    if (annotationenMitLane.length === 0) return [];
    const annotationZoneTop = height + ANNOTATION_ZONE_GAP;
    return annotationenMitLane.map((a, i) => {
      const x = SCALE_MARGIN + berechneSvgX(a.startMs, viewport, plotWidth);
      const xEnd = SCALE_MARGIN + berechneSvgX(a.endMs, viewport, plotWidth);
      const w = Math.max(xEnd - x, 2);
      const y = annotationZoneTop + a.lane * ANNOTATION_LANE_HEIGHT + (ANNOTATION_LANE_HEIGHT - ANNOTATION_BAR_HEIGHT) / 2;
      const fill = a.typ === 'instrumental'
        ? ANNOTATION_COLOR_INSTRUMENTAL
        : ANNOTATION_COLOR_KOMMENTAR;
      const textWidth = schaetzeTextBreite(a.text);
      const needsBubble = w < textWidth;
      // Build accessible title: "Instrumental: Solo, Takt 5 bis 12" or "Kommentar: text, Takt 3 bis 7"
      const typLabel = a.typ === 'instrumental' ? 'Instrumental' : 'Kommentar';
      let title = `${typLabel}: ${a.text}`;
      if (a.startTakt != null) {
        if (a.endTakt != null && a.endTakt !== a.startTakt) {
          title += `, Takt ${a.startTakt} bis ${a.endTakt}`;
        } else {
          title += `, Takt ${a.startTakt}`;
        }
      }
      return { key: `ann-${i}`, x, y, width: w, fill, text: a.text, typ: a.typ, needsBubble, textWidth, title };
    });
  }, [annotationenMitLane, viewport, plotWidth, height]);

  const cursorX = SCALE_MARGIN + berechneSvgX(effectiveTimeMs, viewport, plotWidth);

  // --- Aria-live announcement ---
  const [announcedTime, setAnnouncedTime] = useState("");
  const lastAnnounceRef = useRef(0);

  useEffect(() => {
    const now = effectiveTimeMs;
    if (Math.abs(now - lastAnnounceRef.current) >= ANNOUNCE_INTERVAL_MS) {
      lastAnnounceRef.current = now;
      const seconds = Math.round(now / 1000);
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      setAnnouncedTime(`Position: ${min}:${sec.toString().padStart(2, "0")}`);
    }
  }, [effectiveTimeMs]);

  // --- Keyboard handler ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setManualOffsetMs((prev) => prev - KEYBOARD_SHIFT_MS);
          break;
        case "ArrowRight":
          e.preventDefault();
          setManualOffsetMs((prev) => prev + KEYBOARD_SHIFT_MS);
          break;
      }
    },
    [],
  );

  // --- Aria label ---
  const ariaLabel = useMemo(() => {
    if (balken.length === 0) {
      return "Pitch-Anzeige: Keine Pitch-Balken vorhanden";
    }
    const minNote = midiToNoteName(midiBereich.min);
    const maxNote = midiToNoteName(midiBereich.max);
    let label = `Pitch-Anzeige: ${balken.length} Balken, Tonhöhenbereich ${minNote} bis ${maxNote}`;
    if (annotationen && annotationen.length > 0) {
      label += `, ${annotationen.length} Annotationen`;
    }
    return label;
  }, [balken.length, midiBereich.min, midiBereich.max, annotationen]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={rawHeight != null ? { height } : { height: '100%' }}
    >
      <svg
        width="100%"
        height={totalSvgHeight}
        viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="outline-none focus:ring-2 focus:ring-violet-400/50 rounded"
      >
        {/* Guide lines and note-name scale */}
        {guideNotes.map((note) => {
          const y = berechneSvgY(note.midi, midiMin, midiMax, height, PADDING);
          return (
            <g key={note.midi}>
              {/* Horizontal guide line */}
              <line
                x1={SCALE_MARGIN}
                y1={y}
                x2={svgWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={1}
              />
              {/* Note name label */}
              <text
                x={SCALE_MARGIN - 4}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255, 255, 255, 0.4)"
                fontSize={9}
                fontFamily="monospace"
              >
                {note.name}
              </text>
            </g>
          );
        })}

        {/* Beat and measure markers — vertical lines at beat positions */}
        {beatPositionenMs && beatPositionenMs.length > 0 && beatPositionenMs
          .map((ms, globalIndex) => ({ ms, globalIndex }))
          .filter(({ ms }) => ms >= viewport.startMs && ms <= viewport.endMs)
          .map(({ ms, globalIndex }) => {
            const x = SCALE_MARGIN + berechneSvgX(ms, viewport, plotWidth);
            const istTaktAnfang = globalIndex % taktZaehler === 0;
            const taktNummer = Math.floor(globalIndex / taktZaehler) + 1;
            return (
              <g key={`beat-${globalIndex}`}>
                {/* Beat line (all beats) */}
                <line
                  x1={x}
                  y1={istTaktAnfang ? 0 : 0}
                  x2={x}
                  y2={totalSvgHeight}
                  stroke={istTaktAnfang ? "rgba(255, 255, 255, 0.30)" : "rgba(255, 255, 255, 0.12)"}
                  strokeWidth={istTaktAnfang ? 2 : 1}
                  strokeDasharray={istTaktAnfang ? undefined : "4 4"}
                />
                {/* Measure number label */}
                {istTaktAnfang && (
                  <text
                    x={x + 4}
                    y={height - 5}
                    fill="rgba(255, 255, 255, 0.50)"
                    fontSize={12}
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {taktNummer}
                  </text>
                )}
              </g>
            );
          })}

        {/* Pitch bars */}
        {barRects.map((rect) => (
          <rect
            key={rect.key}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={BAR_HEIGHT}
            rx={BAR_RADIUS}
            ry={BAR_RADIUS}
            fill={BAR_FILL}
          />
        ))}

        {/* Annotation bars with text and speech bubbles */}
        {annotationRects.map((rect) => (
          <g key={rect.key}>
            {/* Accessible title for annotation bar */}
            <title>{rect.title}</title>
            {/* Annotation bar */}
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={ANNOTATION_BAR_HEIGHT}
              rx={ANNOTATION_BAR_RADIUS}
              ry={ANNOTATION_BAR_RADIUS}
              fill={rect.fill}
            />
            {rect.needsBubble ? (
              /* Speech bubble: SVG group above the bar */
              (() => {
                const bubbleWidth = rect.textWidth;
                const barCenterX = rect.x + rect.width / 2;
                const bubbleX = barCenterX - bubbleWidth / 2;
                const bubbleY = rect.y - SPEECH_BUBBLE_GAP - SPEECH_BUBBLE_TRIANGLE_HEIGHT - SPEECH_BUBBLE_HEIGHT;
                const triangleTopY = bubbleY + SPEECH_BUBBLE_HEIGHT;
                const triangleBottomY = triangleTopY + SPEECH_BUBBLE_TRIANGLE_HEIGHT;
                return (
                  <g data-testid="speech-bubble">
                    {/* Bubble background */}
                    <rect
                      x={bubbleX}
                      y={bubbleY}
                      width={bubbleWidth}
                      height={SPEECH_BUBBLE_HEIGHT}
                      rx={3}
                      ry={3}
                      fill={rect.fill}
                    />
                    {/* Triangle pointing down to bar */}
                    <polygon
                      points={`${barCenterX - 4},${triangleTopY} ${barCenterX + 4},${triangleTopY} ${barCenterX},${triangleBottomY}`}
                      fill={rect.fill}
                    />
                    {/* Text centered in bubble */}
                    <text
                      x={barCenterX}
                      y={bubbleY + SPEECH_BUBBLE_HEIGHT / 2 + ANNOTATION_FONT_SIZE * 0.35}
                      textAnchor="middle"
                      fill="white"
                      fontSize={ANNOTATION_FONT_SIZE}
                      fontFamily="sans-serif"
                      style={{ pointerEvents: 'none' }}
                    >
                      {rect.text}
                    </text>
                  </g>
                );
              })()
            ) : (
              /* Text directly on bar (centered, white, small font) */
              <text
                x={rect.x + rect.width / 2}
                y={rect.y + ANNOTATION_BAR_HEIGHT / 2 + ANNOTATION_FONT_SIZE * 0.35}
                textAnchor="middle"
                fill="white"
                fontSize={ANNOTATION_FONT_SIZE}
                fontFamily="sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {rect.text}
              </text>
            )}
          </g>
        ))}

        {/* Playback cursor */}
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={totalSvgHeight}
          stroke="rgba(255, 255, 255, 0.8)"
          strokeWidth={2}
        />
      </svg>

      {/* Beat/Measure counter overlay */}
      {beatPositionenMs && beatPositionenMs.length > 0 && (
        <BeatCounter
          beatPositionenMs={beatPositionenMs}
          currentTimeMs={effectiveTimeMs}
          taktZaehler={taktZaehler}
        />
      )}

      {/* Aria-live region for time announcements */}
      <div aria-live="polite" className="sr-only">
        {announcedTime}
      </div>
    </div>
  );
}

/** Bubble overlay showing current measure and beat-within-measure, styled like the Pitch-View toggle. */
function BeatCounter({
  beatPositionenMs,
  currentTimeMs,
  taktZaehler,
}: {
  beatPositionenMs: number[];
  currentTimeMs: number;
  taktZaehler: number;
}) {
  // Find the index of the last beat that has been passed
  let currentBeatIndex = -1;
  for (let i = beatPositionenMs.length - 1; i >= 0; i--) {
    if (beatPositionenMs[i] <= currentTimeMs) {
      currentBeatIndex = i;
      break;
    }
  }

  if (currentBeatIndex < 0) {
    return (
      <div
        className="absolute top-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/60 shadow-sm"
        aria-label="Kein aktiver Takt"
      >
        —
      </div>
    );
  }

  const taktNummer = Math.floor(currentBeatIndex / taktZaehler) + 1;
  const schlagImTakt = (currentBeatIndex % taktZaehler) + 1;

  return (
    <div
      className="absolute top-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 px-4 py-2 shadow-sm tabular-nums font-mono"
      aria-label={`Takt ${taktNummer}, Schlag ${schlagImTakt}`}
    >
      <span className="text-lg font-bold text-white/90">{taktNummer}</span>
      <span className="text-base text-white/40 mx-0.5">.</span>
      <span className="text-base font-medium text-white/70">{schlagImTakt}</span>
    </div>
  );
}
