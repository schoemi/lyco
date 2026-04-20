# Tasks

## Task 1: useBeatPosition Hook erstellen

- [x] 1.1 Create `src/hooks/use-beat-position.ts` with the `BeatPosition` interface and `useBeatPosition` hook that computes `taktNummer`, `schlagImTakt`, and `beatIndex` from `beatPositionenMs`, `currentTimeMs`, and optional `taktZaehler` (default: 4). Return `null` when no active beat position exists.
- [x] 1.2 Add guard for invalid `taktZaehler` values (0, negative) falling back to default 4.
- [x] 1.3 Create `__tests__/player-beat-counter/beat-position.property.test.ts` with property-based tests using fast-check:
  - Property 1: Taktpositions-Berechnung (taktNummer = floor(beatIndex/taktZaehler)+1, schlagImTakt = (beatIndex%taktZaehler)+1)
  - Property 4: SchlagImTakt range [1, taktZaehler] and taktNummer ≥ 1
- [x] 1.4 Create `__tests__/player-beat-counter/beat-position.test.ts` with unit tests for edge cases: empty array, currentTimeMs before first beat, single beat, default taktZaehler.

## Task 2: BeatCounter Komponente erstellen

- [x] 2.1 Create `src/components/songs/beat-counter.tsx` with `BeatCounterProps` interface accepting `beatPositionenMs`, `currentTimeMs`, `taktZaehler`, and `variant` ("light" | "dark"). Use `useBeatPosition` hook internally.
- [x] 2.2 Implement `variant="light"` styling: compact inline with `rounded-md bg-neutral-100 px-2 py-0.5 text-sm tabular-nums font-mono text-neutral-700`.
- [x] 2.3 Implement `variant="dark"` styling: round overlay with `rounded-full bg-white/10 px-4 py-2 text-lg font-bold text-white/90` (matching existing karaoke style).
- [x] 2.4 Implement placeholder "—" display with `aria-label="Kein aktiver Takt"` when no active beat.
- [x] 2.5 Implement takt/schlag display with `aria-label="Takt {X}, Schlag {Y}"` when active.
- [x] 2.6 Create `__tests__/player-beat-counter/beat-counter.property.test.ts` with property-based tests:
  - Property 2: Conditional rendering (show iff beatPositionenMs non-empty AND currentTimeMs ≥ first beat)
  - Property 3: Aria-label consistency with displayed value
- [x] 2.7 Create `__tests__/player-beat-counter/beat-counter.test.ts` with unit tests for both variants rendering and snapshot tests.

## Task 3: AudioPlayer um BeatCounter erweitern

- [x] 3.1 Add `taktZaehler?: number` prop to `AudioPlayerProps` interface in `src/components/songs/audio-player.tsx`.
- [x] 3.2 Import and render `BeatCounter` with `variant="light"` next to the time display span, conditionally shown when `beatPositionenMs` has entries.
- [x] 3.3 Pass `beatPositionenMs`, `currentTimeMs` (from `useSharedAudio`), and `taktZaehler` to the BeatCounter.

## Task 4: StickyPlayerBar um BeatCounter erweitern

- [x] 4.1 Add `taktZaehler?: number` prop to `StickyPlayerBarProps` interface in `src/components/songs/sticky-player-bar.tsx`.
- [x] 4.2 Import and render `BeatCounter` with `variant="light"` in the controls row, conditionally shown when `beatPositionenMs` has entries.
- [x] 4.3 Pass `beatPositionenMs`, `currentTimeMs` (from `useSharedAudio`), and `taktZaehler` to the BeatCounter.

## Task 5: PitchDisplay refactoren

- [x] 5.1 Remove the private `BeatCounter` function from `src/components/pitch-display/pitch-display.tsx`.
- [x] 5.2 Import the new `BeatCounter` component from `src/components/songs/beat-counter.tsx` and use it with `variant="dark"` and positioning class `absolute top-2 right-2`.
- [x] 5.3 Verify existing beat-detection tests still pass after refactoring.

## Task 6: SongDetailPage Props durchreichen

- [x] 6.1 Pass `taktZaehler={song.beatErgebnis?.taktZaehler}` to `AudioPlayer` in `src/app/(main)/songs/[id]/page.tsx`.
- [x] 6.2 Pass `taktZaehler={song.beatErgebnis?.taktZaehler}` to `StickyPlayerBar` in `src/app/(main)/songs/[id]/page.tsx`.
- [x] 6.3 Run full test suite to verify no regressions.
