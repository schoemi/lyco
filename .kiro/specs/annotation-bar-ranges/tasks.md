# Implementation Plan: Annotation-Taktbereiche

## Overview

This plan implements takt-range (bar-range) annotations for instrumental strophes and comment lines, displayed as colored horizontal bars in the PitchDisplay component. The implementation follows a bottom-up approach: database schema first, then types, services, utilities, UI components, and finally tests. Each task builds incrementally on the previous ones.

## Tasks

- [x] 1. Database schema and TypeScript type extensions
  - [x] 1.1 Add `startTakt` and `endTakt` fields to Prisma schema
    - Add optional `Int?` fields `startTakt` and `endTakt` to the `Strophe` model in `prisma/schema.prisma`
    - Add optional `Int?` fields `startTakt` and `endTakt` to the `Zeile` model in `prisma/schema.prisma`
    - Run `npx prisma migrate dev` to generate and apply the migration
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Extend TypeScript types in `src/types/song.ts`
    - Add `startTakt: number | null` and `endTakt: number | null` to `StropheDetail`
    - Add `startTakt: number | null` and `endTakt: number | null` to `ZeileDetail`
    - Add `startTakt?: number | null` and `endTakt?: number | null` to `UpdateStropheInput`
    - Add `startTakt?: number | null` and `endTakt?: number | null` to `UpdateZeileInput`
    - Add `startTakt?: number` and `endTakt?: number` to `ImportStropheInput`
    - Add `startTakt?: number` and `endTakt?: number` to `ImportZeileInput`
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Service layer: validation and mapping
  - [x] 2.1 Extend `StropheService` with taktbereich validation and mapping
    - In `src/lib/services/strophe-service.ts`, add taktbereich validation to `updateStrophe()`: check `startTakt` and `endTakt` are positive integers or null, reject `endTakt` without `startTakt`, enforce `startTakt ≤ endTakt`
    - Extend `mapStrophe()` to include `startTakt` and `endTakt` in the returned `StropheDetail`
    - Add `startTakt` and `endTakt` to the `updateData` object when present in the input
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.5_

  - [x] 2.2 Extend `ZeileService` with taktbereich validation and mapping
    - In `src/lib/services/zeile-service.ts`, add taktbereich validation to `updateZeile()`: same rules as StropheService
    - Extend `mapZeile()` to include `startTakt` and `endTakt` in the returned `ZeileDetail`
    - Add `startTakt` and `endTakt` to the `updateData` object when present in the input
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 3.2, 3.4, 3.6_

  - [x] 2.3 Extend `SongService` import and getSongDetail
    - In `src/lib/services/song-service.ts`, update `importSong()` to pass `startTakt` and `endTakt` when creating strophes and zeilen, applying the same validation rules
    - Update `getSongDetail()` mapping to include `startTakt` and `endTakt` in `StropheDetail` and `ZeileDetail`
    - _Requirements: 3.5, 3.6, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.4 Write property tests for taktbereich validation (Properties 1 & 2)
    - **Property 1: Taktbereich-Validierung akzeptiert nur gültige Werte**
    - **Validates: Requirements 2.1, 2.2, 2.6, 2.7, 10.4**
    - Create `__tests__/annotation-bar-ranges/taktbereich-validierung.property.test.ts`
    - Use fast-check to generate arbitrary startTakt/endTakt values and verify validation accepts only positive integers or null

  - [ ]* 2.5 Write property test for taktbereich invariant (Property 2)
    - **Property 2: Taktbereich-Invariante startTakt ≤ endTakt**
    - **Validates: Requirements 2.3, 2.5, 2.8, 2.9, 2.10**
    - Create `__tests__/annotation-bar-ranges/taktbereich-invariante.property.test.ts`
    - Use fast-check to verify all valid combinations satisfy the startTakt ≤ endTakt invariant

- [x] 3. Checkpoint - Ensure schema, types, and services work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Takt-Konverter utility
  - [x] 4.1 Implement `takt-konverter.ts`
    - Create `src/lib/pitch-display/takt-konverter.ts`
    - Implement `taktZuMs(taktNummer, beatPositionenMs, taktZaehler)`: returns `beats[min((t-1)*tz, beats.length-1)]` or `null` for empty arrays
    - Implement `taktEndZuMs(taktNummer, beatPositionenMs, taktZaehler)`: returns `beats[min(t*tz, beats.length-1)]` or `null` for empty arrays
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 Write property tests for taktZuMs correctness (Property 3)
    - **Property 3: taktZuMs gibt den korrekten Beat-Zeitpunkt zurück**
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.5**
    - Create `__tests__/annotation-bar-ranges/takt-zu-ms-korrektheit.property.test.ts`

  - [ ]* 4.3 Write property test for start ≤ end ordering (Property 4)
    - **Property 4: taktZuMs(t) ≤ taktEndZuMs(t) für alle gültigen Taktnummern**
    - **Validates: Requirements 4.3, 4.6**
    - Create `__tests__/annotation-bar-ranges/takt-start-end-ordnung.property.test.ts`

  - [ ]* 4.4 Write property test for monotonicity (Property 5)
    - **Property 5: Monotonie von taktZuMs**
    - **Validates: Requirements 4.7**
    - Create `__tests__/annotation-bar-ranges/takt-monotonie.property.test.ts`

  - [ ]* 4.5 Write property test for range invariant (Property 6)
    - **Property 6: Bereichs-Invariante der Takt-Konvertierung**
    - **Validates: Requirements 4.8**
    - Create `__tests__/annotation-bar-ranges/takt-bereichs-invariante.property.test.ts`

  - [ ]* 4.6 Write unit tests for takt-konverter
    - Create `__tests__/annotation-bar-ranges/takt-konverter.test.ts`
    - Test edge cases: empty array, single beat, takt beyond array end, various taktZaehler values
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Annotations-Aufbereitung utility
  - [x] 5.1 Implement `annotations-aufbereitung.ts`
    - Create `src/lib/pitch-display/annotations-aufbereitung.ts`
    - Define `AnnotationsTyp` type and `AnnotationsBalken` interface
    - Implement `erzeugeAnnotationsBalken(strophen, beatPositionenMs, taktZaehler)`:
      - Generate `'instrumental'` bars for strophes with `istInstrumental && startTakt`
      - Generate `'instrumental'` bars for strophes with `istInstrumental && !startTakt` but with timecode markup (fallback)
      - Generate `'kommentar'` bars for zeilen with `istKommentar && startTakt`
      - Skip zeilen/strophes without taktbereich (and without timecode fallback)
      - Sort result by `startMs`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 5.2 Write property test for correct bar generation (Property 7)
    - **Property 7: Annotations-Aufbereitung erzeugt korrekte Balken**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7**
    - Create `__tests__/annotation-bar-ranges/annotations-aufbereitung-korrektheit.property.test.ts`

  - [ ]* 5.3 Write property test for startMs ≤ endMs invariant (Property 8)
    - **Property 8: Annotations-Aufbereitung startMs ≤ endMs Invariante**
    - **Validates: Requirements 5.8**
    - Create `__tests__/annotation-bar-ranges/annotations-aufbereitung-invariante.property.test.ts`

  - [ ]* 5.4 Write unit tests for annotations-aufbereitung
    - Create `__tests__/annotation-bar-ranges/annotations-aufbereitung.test.ts`
    - Test timecode fallback, mixed strophes, empty input, kommentar zeilen without taktbereich
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 5.5 Create shared fast-check generators
    - Create `__tests__/annotation-bar-ranges/generators.ts`
    - Implement `arbBeatPositionenMs()`, `arbTaktZaehler()`, `arbTaktNummer()`, `arbStropheDetail()`, `arbZeileDetail()`, `arbAnnotationsBalken()`
    - These generators are used across all property tests in this feature

- [x] 6. Checkpoint - Ensure utilities and property tests work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. PitchDisplay component extension
  - [x] 7.1 Add `annotationen` prop and annotations zone to PitchDisplay
    - In `src/components/pitch-display/pitch-display.tsx`, add optional `annotationen?: AnnotationsBalken[]` prop
    - Implement viewport filtering for annotation bars (reuse `filterSichtbareBalken` pattern)
    - Implement lane assignment with greedy algorithm for overlapping bars
    - Reserve annotation zone at bottom of SVG: `ANNOTATION_LANE_HEIGHT = 22px` per lane
    - Extend SVG height by annotation zone height when annotations are present
    - Render annotation bars as colored `<rect>` elements with rounded corners (instrumental: `rgba(56, 189, 248, 0.6)`, kommentar: `rgba(251, 191, 36, 0.6)`)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Implement text rendering and speech bubble logic
    - Estimate text width via character count heuristic
    - When bar width ≥ text width: render text directly on bar (centered, white, small font)
    - When bar width < text width: render speech bubble as SVG group (`<g>`, `<rect>`, `<text>`, `<polygon>`) with semi-transparent background in annotation color and triangle pointing down to bar
    - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.3 Add accessibility attributes for annotations
    - Extend `aria-label` of SVG to include annotation count (e.g. "Pitch-Anzeige: 42 Balken, Tonhöhenbereich C3 bis G4, 3 Annotationen")
    - Add `<title>` element to each annotation bar with type, text, and takt range (e.g. "Instrumental: Solo, Takt 5 bis 12")
    - Keep existing aria-label unchanged when no annotations present
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 7.4 Write property test for lane assignment (Property 9)
    - **Property 9: Lane-Zuweisung ohne Überlappung**
    - **Validates: Requirements 6.7**
    - Create `__tests__/annotation-bar-ranges/lane-zuweisung.property.test.ts`

  - [ ]* 7.5 Write property test for viewport filtering (Property 10)
    - **Property 10: Viewport-Filterung der Annotationsbalken**
    - **Validates: Requirements 6.8**
    - Create `__tests__/annotation-bar-ranges/viewport-filterung.property.test.ts`

  - [ ]* 7.6 Write unit tests for PitchDisplay annotations rendering
    - Create `__tests__/annotation-bar-ranges/pitch-display-annotations.test.tsx`
    - Test rendering with/without annotations, correct colors, speech bubbles, aria-labels
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.5, 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 11.3_

- [x] 8. Editor UI for taktbereich input
  - [x] 8.1 Add taktbereich input fields to StropheEditor
    - In `src/components/songs/strophe-editor.tsx`, when `strophe.istInstrumental === true`, show two `<input type="number" min={1} step={1}>` fields labeled "Takt von" / "bis"
    - Compact inline layout next to the instrumental toggle
    - On blur or Enter: send PATCH request with `startTakt` and `endTakt`
    - Empty fields send `null` (remove taktbereich)
    - Client-side validation: `endTakt >= startTakt`, only positive integers
    - Optimistic update with rollback on API error
    - Hide fields when `istInstrumental === false`
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.7, 8.8, 8.9_

  - [x] 8.2 Add taktbereich input fields to ZeileEditor
    - In `src/components/songs/zeile-editor.tsx`, when `zeile.istKommentar === true`, show two `<input type="number" min={1} step={1}>` fields labeled "Takt von" / "bis"
    - Same logic as StropheEditor: PATCH on blur/Enter, null for empty, client-side validation, optimistic update
    - Hide fields when `istKommentar === false`
    - _Requirements: 8.2, 8.3, 8.4, 8.6, 8.7, 8.8, 8.9_

  - [ ]* 8.3 Write unit tests for editor taktbereich fields
    - Create `__tests__/annotation-bar-ranges/editor-taktbereich.test.tsx`
    - Test fields visible/hidden based on istInstrumental/istKommentar, validation errors, optimistic update and rollback
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [ ] 9. Integration tests
  - [ ]* 9.1 Write integration tests for StropheService taktbereich API
    - Create `__tests__/annotation-bar-ranges/strophe-taktbereich-api.test.ts`
    - Test PATCH startTakt/endTakt, GET includes fields, validation errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.5_

  - [ ]* 9.2 Write integration tests for ZeileService taktbereich API
    - Create `__tests__/annotation-bar-ranges/zeile-taktbereich-api.test.ts`
    - Test PATCH startTakt/endTakt, GET includes fields, validation errors
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 3.2, 3.4, 3.6_

  - [ ]* 9.3 Write integration tests for import with taktbereich
    - Create `__tests__/annotation-bar-ranges/import-taktbereich.test.ts`
    - Test import with/without taktbereich, validation, default null values
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The shared generators file (task 5.5) should ideally be created before the property tests that use it, but each property test can also define inline generators if needed
