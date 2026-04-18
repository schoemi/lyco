# Implementation Plan: Karaoke Pitch Display

## Overview

Extend the existing Vocal Trainer and Karaoke views with an SVG-based pitch visualization. The implementation follows a bottom-up approach: first the pure data transformation layer (aggregation, serialization, coordinate math), then the SVG rendering component, and finally integration into both the Vocal Trainer and Karaoke views. All code uses TypeScript, React, SVG, and follows the existing project patterns (Vitest + fast-check, Tailwind, `useMemo` for derived data).

## Tasks

- [x] 1. Define PitchBalken type and implement frame aggregation logic
  - [x] 1.1 Create `src/lib/pitch-display/pitch-balken.ts` with the `PitchBalken` interface (`startMs`, `endMs`, `midiValue`, `durationMs`) and the pure function `aggregiereFramesZuBalken(frames: ReferenzFrame[]): PitchBalken[]` that groups consecutive voiced frames into pitch bars
    - Consecutive frames where `isVoiced === true` are merged into a single `PitchBalken`
    - Unvoiced frames (`isVoiced === false`) produce no bars
    - Empty or all-unvoiced input returns an empty array
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [x] 1.2 Write property test for aggregation invariant
    - **Property 1: Aggregation count invariant** — the number of produced `PitchBalken` is ≤ the number of contiguous voiced segments in the input frames
    - **Validates: Requirement 1.6**
    - Create `__tests__/pitch-display/aggregation-invariant.property.test.ts` using fast-check

  - [x] 1.3 Write unit tests for `aggregiereFramesZuBalken`
    - Test empty frames array, all-unvoiced frames, single voiced frame, multiple contiguous voiced segments, alternating voiced/unvoiced
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 2. Implement serialization and deserialization for PitchBalken
  - [x] 2.1 Add `serializePitchBalken(balken: PitchBalken[]): string` and `deserializePitchBalken(json: string): PitchBalken[]` functions to `src/lib/pitch-display/pitch-balken.ts`
    - Serialize to JSON string, deserialize with validation
    - Throw a descriptive error on invalid JSON input
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 2.2 Write property test for round-trip serialization
    - **Property 2: Round-trip consistency** — `deserializePitchBalken(serializePitchBalken(balken))` produces an equivalent array for all valid `PitchBalken[]`
    - **Validates: Requirement 8.4**
    - Create `__tests__/pitch-display/serialization-roundtrip.property.test.ts` using fast-check

  - [x] 2.3 Write unit tests for serialization edge cases
    - Test empty array, invalid JSON string, malformed JSON structure
    - _Requirements: 8.4, 8.5_

- [x] 3. Implement viewport and coordinate calculation utilities
  - [x] 3.1 Create `src/lib/pitch-display/pitch-coordinates.ts` with pure functions for coordinate math
    - `berechneViewport(currentTimeMs: number, windowDurationMs: number): { startMs: number; endMs: number }` — positions cursor in the left third of the viewport
    - `filterSichtbareBalken(balken: PitchBalken[], viewport: { startMs: number; endMs: number }): PitchBalken[]` — returns only bars overlapping the viewport
    - `berechneSvgX(timeMs: number, viewport: { startMs: number; endMs: number }, svgWidth: number): number` — maps time to SVG x-coordinate
    - `berechneSvgY(midiValue: number, midiMin: number, midiMax: number, svgHeight: number, padding: number): number` — maps MIDI value to SVG y-coordinate
    - `berechneMidiBereich(balken: PitchBalken[]): { min: number; max: number }` — computes the MIDI range across all bars
    - _Requirements: 2.2, 2.3, 3.1, 4.1, 4.2, 4.3_

  - [x] 3.2 Write property test for viewport cursor positioning
    - **Property 3: Cursor left-third positioning** — for any `currentTimeMs` and `windowDurationMs > 0`, the cursor x-position falls within the left third of the SVG width
    - **Validates: Requirement 4.2**
    - Create `__tests__/pitch-display/viewport-positioning.property.test.ts` using fast-check

  - [x] 3.3 Write unit tests for coordinate calculation functions
    - Test `filterSichtbareBalken` with bars fully inside, partially overlapping, and fully outside the viewport
    - Test `berechneSvgX` and `berechneSvgY` boundary values
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Build the PitchDisplay SVG component
  - [x] 5.1 Create `src/components/pitch-display/pitch-display.tsx` — the main React component
    - Props: `balken: PitchBalken[]`, `currentTimeMs: number`, `isPlaying: boolean`, `height?: number` (default 120, range 80–200), `windowDurationMs?: number` (default 15000, range 10000–30000)
    - Render an SVG element with `role="img"` and a descriptive `aria-label` summarizing bar count and pitch range
    - Use `useMemo` to compute viewport, visible bars, MIDI range, and SVG coordinates (following `VergleichsGraph` pattern)
    - Render pitch bars as `<rect>` elements with rounded corners (`rx`/`ry`), 6px height, semi-transparent violet fill (`rgba(139, 92, 246, 0.7)`)
    - Render the playback cursor as a vertical `<line>` element, visually distinct (e.g., white with opacity)
    - Render horizontal guide lines at note positions and a vertical note-name scale (e.g., C3, D3, E3) on the left side
    - Use `requestAnimationFrame` for smooth cursor animation when `isPlaying` is true
    - Make the component keyboard-focusable (`tabIndex={0}`) with arrow key handlers to manually shift the viewport
    - Include an `aria-live="polite"` region that announces the current time position every ~5 seconds
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4_

  - [x] 5.2 Write unit tests for PitchDisplay rendering
    - Test that SVG renders with `role="img"` and `aria-label`
    - Test that no bars render when given empty `balken` array
    - Test that cursor renders at correct position when `isPlaying` is true
    - Test keyboard focus and arrow key interaction
    - Use `@testing-library/react` following existing test patterns
    - _Requirements: 9.1, 9.2, 9.3, 7.1, 7.2, 7.3_

- [x] 6. Integrate PitchDisplay into the Vocal Trainer view
  - [x] 6.1 Modify `src/components/vocal-trainer/vocal-trainer-view.tsx` to render `PitchDisplay` above `TextAnzeige` during the `AUFNAHME` state
    - Import `PitchDisplay` and `aggregiereFramesZuBalken`
    - Use `useMemo` to compute `PitchBalken[]` from `referenzDaten.frames`
    - Track `currentTimeMs` from the existing `audioRef.current.currentTime * 1000` interval (already in `timecodeIntervalRef`)
    - Show `PitchDisplay` only when `zustand === "AUFNAHME"`, hide in `BEREIT` and `ERGEBNIS` states
    - When `displayMode === "keinText"`, let `PitchDisplay` use the full available area
    - Ensure the existing `TextAnzeige` and timecode highlighting remain unaffected
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 2.1, 2.4, 2.5_

  - [x] 6.2 Write unit tests for Vocal Trainer PitchDisplay integration
    - Test that PitchDisplay renders when `zustand === "AUFNAHME"` and does not render in `BEREIT` / `ERGEBNIS`
    - Test that TextAnzeige still renders alongside PitchDisplay
    - _Requirements: 5.1, 5.3, 5.4_

- [x] 7. Integrate PitchDisplay into the Karaoke view
  - [x] 7.1 Modify `src/components/karaoke/karaoke-view.tsx` to conditionally render `PitchDisplay` above `TextAnzeige`
    - Add `referenzDaten?: ReferenzDaten` and `pitchDisplayEnabled?: boolean` to `KaraokeViewProps`
    - Compute `PitchBalken[]` via `useMemo` from `referenzDaten.frames` when available
    - Track `currentTimeMs` from the existing `onAudioTimeUpdate` callback
    - Only render `PitchDisplay` when `referenzDaten` is present, audio is playing, and `pitchDisplayEnabled` is true
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 7.2 Add a toggle button in the Karaoke view to enable/disable the PitchDisplay
    - Add a toggle button in the controls area (near `ModusUmschalter`) to switch pitch display on/off
    - Store toggle state in component state, default to `true` when `referenzDaten` is available
    - When `referenzDaten` is not available, do not render the toggle button
    - _Requirements: 6.3_

  - [x] 7.3 Write unit tests for Karaoke PitchDisplay integration
    - Test that PitchDisplay does not render when `referenzDaten` is undefined
    - Test that toggle button shows/hides the PitchDisplay
    - Test that PitchDisplay receives `currentTimeMs` from audio time updates
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Performance optimization and smooth scrolling
  - [x] 9.1 Optimize PitchDisplay rendering performance
    - Ensure `filterSichtbareBalken` is used so only visible bars are rendered (virtualization)
    - Wrap coordinate calculations in `useMemo` with proper dependency arrays
    - Use `requestAnimationFrame` loop for cursor animation instead of React re-renders
    - Verify that viewport shift recalculation completes within 16ms for up to 10,000 frames
    - Implement smooth viewport transitions (no visible jumps) using interpolation or CSS transitions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 4.4_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the requirements (aggregation invariant, round-trip serialization, viewport positioning)
- Unit tests validate specific examples and edge cases
- The project uses Vitest + fast-check for property-based testing and `@testing-library/react` for component tests
- All new files follow the existing project structure under `src/lib/` for utilities and `src/components/` for React components
