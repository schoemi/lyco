# Implementation Plan: Instrumental-Annotations

## Overview

This plan implements two annotation flags — `istInstrumental` on strophes and `istKommentar` on zeilen — that visually mark non-sung sections while excluding them from all learning modes. The implementation follows a bottom-up approach: database schema first, then types, shared filter logic, service layer, learning mode integrations, and finally UI components.

## Tasks

- [x] 1. Database schema and TypeScript types
  - [x] 1.1 Add Prisma schema fields and run migration
    - Add `istInstrumental Boolean @default(false)` to the `Strophe` model in `prisma/schema.prisma`
    - Add `istKommentar Boolean @default(false)` to the `Zeile` model in `prisma/schema.prisma`
    - Generate and run the Prisma migration
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Extend TypeScript interfaces in `src/types/song.ts`
    - Add `istInstrumental: boolean` to `StropheDetail`
    - Add `istKommentar: boolean` to `ZeileDetail`
    - Add `istInstrumental?: boolean` to `UpdateStropheInput`
    - Add `istKommentar?: boolean` to `UpdateZeileInput`
    - Add `istInstrumental?: boolean` to `ImportStropheInput`
    - Add `istKommentar?: boolean` to `ImportZeileInput`
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [x] 2. Shared filter functions and property tests
  - [x] 2.1 Implement `filterLernbareStrophen` and `filterLernbareZeilen` in `src/lib/shared/strophen-selection.ts`
    - `filterLernbareStrophen(strophen: StropheDetail[]): StropheDetail[]` — filters out strophes where `istInstrumental === true`
    - `filterLernbareZeilen(zeilen: ZeileDetail[]): ZeileDetail[]` — filters out zeilen where `istKommentar === true`
    - _Requirements: 11.1, 11.2_

  - [x] 2.2 Write property test: filterLernbareStrophen subset invariant
    - Create `__tests__/instrumental/generators.ts` with shared fast-check arbitraries for `StropheDetail[]` and `ZeileDetail[]` with varying `istInstrumental`/`istKommentar` flags
    - Create `__tests__/instrumental/filter-strophen-invariant.property.test.ts`
    - **Property 1: filterLernbareStrophen Subset-Invariante**
    - **Validates: Requirements 11.1, 11.3**

  - [x]* 2.3 Write property test: filterLernbareStrophen idempotence
    - Create `__tests__/instrumental/filter-strophen-idempotent.property.test.ts`
    - **Property 2: filterLernbareStrophen Idempotenz**
    - **Validates: Requirements 11.5**

  - [x]* 2.4 Write property test: filterLernbareZeilen subset invariant
    - Create `__tests__/instrumental/filter-zeilen-invariant.property.test.ts`
    - **Property 3: filterLernbareZeilen Subset-Invariante**
    - **Validates: Requirements 11.2, 11.4**

  - [x]* 2.5 Write property test: filterLernbareZeilen idempotence
    - Create `__tests__/instrumental/filter-zeilen-idempotent.property.test.ts`
    - **Property 4: filterLernbareZeilen Idempotenz**
    - **Validates: Requirements 11.6**

- [x] 3. Service layer: mapping and persistence
  - [x] 3.1 Update `mapStrophe` and `updateStrophe` in `src/lib/services/strophe-service.ts`
    - Extend `mapStrophe` to include `istInstrumental` from the DB object into `StropheDetail`
    - Extend `updateStrophe` to accept and persist `istInstrumental` from `UpdateStropheInput`
    - _Requirements: 1.1, 1.2, 8.1, 8.3_

  - [x] 3.2 Update `mapZeile` and `updateZeile` in `src/lib/services/zeile-service.ts`
    - Extend `mapZeile` to include `istKommentar` from the DB object into `ZeileDetail`
    - Extend `updateZeile` to accept and persist `istKommentar` from `UpdateZeileInput`
    - _Requirements: 2.1, 2.2, 8.2, 8.4_

  - [x] 3.3 Update `importSong` and `getSongDetail` in `src/lib/services/song-service.ts`
    - In `importSong`: pass `istInstrumental` per strophe and `istKommentar` per zeile to Prisma create calls (default `false`)
    - In `getSongDetail`: include `istInstrumental` and `istKommentar` in the mapping logic for strophen and zeilen
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 3.4 Update `listSongs` progress calculation in `src/lib/services/song-service.ts`
    - Exclude strophes with `istInstrumental === true` from the average progress calculation
    - If all strophes are instrumental, return progress 0
    - _Requirements: 9.1, 9.2_

  - [x] 3.5 Add instrumental guard to `erstelleWiederholung` in `src/lib/services/spaced-repetition-service.ts`
    - Before creating a Wiederholung, check if `strophe.istInstrumental === true`
    - If yes, throw error: "Instrumentale Strophen können nicht zur Wiederholung hinzugefügt werden"
    - _Requirements: 3.5_

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Learning mode integrations
  - [x] 5.1 Update `flattenLines` in `src/lib/karaoke/flatten-lines.ts`
    - Import and use `filterLernbareStrophen` to skip instrumental strophes
    - Import and use `filterLernbareZeilen` to skip kommentar zeilen within remaining strophes
    - _Requirements: 3.2, 3.6, 3.7, 4.2, 4.4, 4.5_

  - [x]* 5.2 Write property test: flattenLines excludes non-learnable content
    - Create `__tests__/instrumental/flatten-lines-exclusion.property.test.ts`
    - **Property 5: FlattenLines schließt nicht-lernbare Inhalte aus**
    - **Validates: Requirements 3.2, 3.6, 3.7, 4.2, 4.4, 4.5**

  - [x] 5.3 Update `QuizGenerator` in `src/lib/quiz/quiz-generator.ts`
    - In `filterActiveStrophen`: additionally filter out strophes with `istInstrumental === true`
    - In `collectWords`: skip zeilen with `istKommentar === true`
    - In `generateMCQuestions`, `generateReihenfolgeQuestions`, `generateDiktatQuestions`: skip kommentar zeilen when building candidates
    - _Requirements: 3.1, 4.1_

  - [x] 5.4 Write property test: QuizGenerator excludes non-learnable content
    - Create `__tests__/instrumental/quiz-generator-exclusion.property.test.ts`
    - **Property 6: QuizGenerator schließt nicht-lernbare Inhalte aus**
    - **Validates: Requirements 3.1, 4.1**

  - [x] 5.5 Update cloze page `getZeilenFromSong` in `src/app/(main)/songs/[id]/cloze/page.tsx`
    - Use `filterLernbareStrophen` before filtering by activeStrophenIds
    - Use `filterLernbareZeilen` on each strophe's zeilen before mapping to `ZeileInput`
    - _Requirements: 3.4, 4.3_

  - [x]* 5.6 Write property test: progress calculation excludes instrumental strophes
    - Create `__tests__/instrumental/progress-calculation.property.test.ts`
    - **Property 7: Fortschrittsberechnung schließt Instrumental-Strophen aus**
    - **Validates: Requirements 9.1, 9.2**

- [x] 6. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. UI components: display and styling
  - [x] 7.1 Update `StropheCard` in `src/components/songs/strophe-card.tsx`
    - When `strophe.istInstrumental === true`: apply dimmed styling (opacity, italic), show "[Instrumental]" badge next to strophe name, hide note area and progress bar
    - When `zeile.istKommentar === true`: render zeile in italic with dimmed color, visually distinguish from normal zeilen
    - _Requirements: 1.4, 1.5, 2.4, 2.5_

  - [x] 7.2 Update `StrophenAnzeige` in `src/components/karaoke/strophen-anzeige.tsx`
    - Display kommentar zeilen with special styling (italic, dimmed opacity)
    - Do not treat kommentar zeilen as active line (no highlighting, no scroll target)
    - _Requirements: 5.1, 6.1, 6.3_

  - [x] 7.3 Update cloze `StrophenAuswahlDialog` in `src/components/cloze/strophen-auswahl-dialog.tsx`
    - Filter instrumental strophes from the selection list using `filterLernbareStrophen`
    - "Alle auswählen" and "Schwächen üben" only consider learnable strophes
    - Show hint message when no learnable strophes remain
    - _Requirements: 3.3_

  - [x] 7.4 Update quiz `StrophenAuswahlDialog` in `src/components/quiz/strophen-auswahl-dialog.tsx`
    - Filter instrumental strophes from the selection list using `filterLernbareStrophen`
    - "Alle auswählen" and "Schwächen üben" only consider learnable strophes
    - Show hint message when no learnable strophes remain
    - _Requirements: 3.3_

  - [x]* 7.5 Write unit tests for StropheCard instrumental/kommentar styling
    - Create `__tests__/instrumental/strophe-card-instrumental.test.ts`
    - Test instrumental badge rendering, dimmed styling, hidden note/progress
    - Test kommentar zeile italic styling
    - _Requirements: 1.4, 1.5, 2.4, 2.5_

  - [x]* 7.6 Write unit tests for StrophenAnzeige kommentar styling
    - Create `__tests__/instrumental/strophen-anzeige-instrumental.test.ts`
    - Test kommentar zeile styling in lesemodus
    - Test kommentar zeile not treated as active line
    - _Requirements: 5.1, 6.1_

  - [x]* 7.7 Write unit tests for StrophenAuswahlDialog instrumental filtering
    - Create `__tests__/instrumental/strophen-auswahl-dialog.test.ts`
    - Test instrumental strophes excluded from selection list
    - Test "Alle auswählen" only selects learnable strophes
    - _Requirements: 3.3_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The shared filter functions in `strophen-selection.ts` are the single source of truth for learning mode filtering — all consumers use them rather than implementing their own filter logic
