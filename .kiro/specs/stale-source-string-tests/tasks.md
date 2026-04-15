# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stale Source-String Assertions Fail on Unfixed Code
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists across all seven affected test files
  - **Scoped PBT Approach**: For each affected test file, generate the file path and the specific assertion pattern that should match the current production source. Use `fc.constantFrom` over the set of (testFile, expectedPattern, sourceFile) tuples to verify each assertion against the actual source content.
  - Bug Condition from design: `isBugCondition(T)` where `T.assertionPattern ≠ T.currentSourcePattern AND T.assertionType ∈ { regex_match, string_contains, occurrence_count }`
  - Test the following concrete failing cases:
    - `completion.test.ts`: regex `for\s*\(\s*const\s+strophe\s+of\s+strophenToUpdate\s*\)` should match `src/app/(main)/songs/[id]/cloze/page.tsx`
    - `dialog-strophe-order.property.test.ts`: regex `sortedStrophen\s*=\s*\[\.\.\.lernbareStrophen\]\.sort\(` should match `src/components/cloze/strophen-auswahl-dialog.tsx`
    - `select-all-none.property.test.ts`: regex `handleSelectAll[\s\S]*?setLocalSelection\(new Set\(lernbareStrophen\.map\(` should match `src/components/cloze/strophen-auswahl-dialog.tsx`
    - `display-mode.property.test.ts`: source should contain `StageSongAnzeige` as sole display component (not `einzelzeile`, `EinzelzeileAnzeige`, `StrophenAnzeige`, `settings.displayMode`)
    - `song-info-overlay.test.ts`: source should NOT contain `showSongInfo` state, `song.titel`, `song.kuenstler`, `3000` setTimeout in the page (overlay was removed)
    - `translate-button.test.ts`: source should contain `AppIcon` with `icon="lucide:globe"` and `"Übersetzen"` without emoji (not `"🌐 Übersetzen"`)
    - `page-integration.test.ts`: source should contain `SongActionMenu` (not literal `"Löschen"`), and `"+ Neuer Song"` should appear exactly 1 time (not ≥2)
  - Run test on UNFIXED code — expect FAILURE (this confirms the bug exists: the current tests assert old patterns, not the new expected patterns)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unaffected Test Assertions Remain Passing
  - **IMPORTANT**: Follow observation-first methodology
  - **GOAL**: Verify that all test assertions NOT affected by the refactoring continue to pass on unfixed code
  - Observe behavior on UNFIXED code for non-buggy inputs (assertions whose patterns still match the current source)
  - Write property-based tests that verify the following categories of unaffected assertions still pass:
    - **Pure function tests**: `shouldShowSongInfo` returns true when songId differs from prevSongId, false when equal, true when prevSongId is null
    - **Sorting stability**: property-based sorting tests in `dialog-strophe-order.property.test.ts` (ascending order, all elements preserved) still pass
    - **Set operations**: property-based selectAll/deselectAll/validation tests in `select-all-none.property.test.ts` still pass
    - **Accessibility attributes**: `aria-label="Songtext übersetzen"`, `aria-busy={translating}`, `min-h-[44px]`, `min-w-[44px]` in `translate-button.test.ts` still pass
    - **Component wiring**: `SongDeleteDialog` props (`open`, `song`, `onClose`, `onDeleted`), `SongEditForm`/`StropheEditor` imports in `page-integration.test.ts` still pass
    - **Completion logic**: `completionFired` ref, `score.correct`/`score.total` checks, progress/session API call patterns in `completion.test.ts` still pass
  - Use `fc.constantFrom` over (testFile, assertionDescription, assertionCheck) tuples to systematically verify each unaffected assertion
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix stale source-string test assertions

  - [x] 3.1 Update `completion.test.ts` — strophe iteration regex
    - Change regex from `for\s*\(\s*(const|let|var)\s+\w+\s+of\s+song.*strophen\s*\)` to `for\s*\(\s*const\s+strophe\s+of\s+strophenToUpdate\s*\)` to match the refactored loop variable
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern = old regex, T.currentSourcePattern = `for (const strophe of strophenToUpdate)`_
    - _Expected_Behavior: Updated regex matches current source, test passes_
    - _Preservation: All other assertions in completion.test.ts (score detection, completionFired ref, API calls, try/catch) remain unchanged_
    - _Requirements: 2.1, 3.5_

  - [x] 3.2 Update `dialog-strophe-order.property.test.ts` — sorting pattern regex
    - Change regex from `sortedStrophen\s*=\s*\[\.\.\.strophen\]\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.orderIndex\s*-\s*b\.orderIndex` to `sortedStrophen\s*=\s*\[\.\.\.lernbareStrophen\]\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.orderIndex\s*-\s*b\.orderIndex`
    - Keep `sortedStrophen.map` assertion unchanged (component still uses `sortedStrophen.map` for rendering)
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern = `[...strophen].sort(`, T.currentSourcePattern = `[...lernbareStrophen].sort(`_
    - _Expected_Behavior: Updated regex matches current source, test passes_
    - _Preservation: Property-based sorting tests (ascending order, stability) and `sortedStrophen.map` assertion remain unchanged_
    - _Requirements: 2.2, 3.1_

  - [x] 3.3 Update `select-all-none.property.test.ts` — handleSelectAll regex
    - Change regex from `handleSelectAll[\s\S]*?setLocalSelection\(new Set\(strophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)` to `handleSelectAll[\s\S]*?setLocalSelection\(new Set\(lernbareStrophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)`
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern = `strophen.map(s => s.id)`, T.currentSourcePattern = `lernbareStrophen.map(s => s.id)`_
    - _Expected_Behavior: Updated regex matches current source, test passes_
    - _Preservation: Set operation property tests (selectAll full set, deselectAll empty set, validation blocks zero), handleDeselectAll assertion, and validation assertion remain unchanged_
    - _Requirements: 2.3, 3.1_

  - [x] 3.4 Update `display-mode.property.test.ts` — replace removed display mode tests
    - Remove tests for `"einzelzeile"`, `"EinzelzeileAnzeige"`, `"StrophenAnzeige"`, and `"settings.displayMode"` since these patterns no longer exist in the stage page
    - Replace with assertions that `StageSongAnzeige` is the sole display component: verify source contains `StageSongAnzeige` and does NOT contain `EinzelzeileAnzeige` or `StrophenAnzeige`
    - Replace the `fc.constantFrom` property test with a test verifying only song mode is used
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern ∈ {einzelzeile, EinzelzeileAnzeige, StrophenAnzeige, settings.displayMode}, T.currentSourcePattern = StageSongAnzeige only_
    - _Expected_Behavior: Updated tests verify StageSongAnzeige is sole display component, tests pass_
    - _Preservation: No other assertions in this file are unaffected — all assertions in this file need updating_
    - _Requirements: 2.4_

  - [x] 3.5 Update `song-info-overlay.test.ts` — remove overlay source-inspection tests
    - Remove the entire `"Song-Info-Overlay Quellcode-Inspektion"` describe block that checks for `showSongInfo` state, `song.titel`, `song.kuenstler`, `3000` (setTimeout), and `aria-live` in the page source
    - Keep the `"shouldShowSongInfo"` describe block unchanged since the pure function is still exported and works correctly
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern ∈ {showSongInfo state, song.titel, song.kuenstler, 3000 setTimeout}, T.currentSourcePattern = patterns removed from page_
    - _Expected_Behavior: Source-inspection tests removed, pure function tests preserved, file passes_
    - _Preservation: shouldShowSongInfo pure function tests (true for different IDs, false for same ID, true for null prevSongId) remain unchanged_
    - _Requirements: 2.5, 3.1_

  - [x] 3.6 Update `translate-button.test.ts` — replace emoji assertions with AppIcon assertions
    - Change `expect(source).toContain("🌐 Übersetzen")` to check for `AppIcon` usage with `icon="lucide:globe"` and the string `"Übersetzen"` (without emoji)
    - Update the ternary regex `translating\s*\?\s*"Übersetze…"\s*:\s*"🌐 Übersetzen"` to match the current JSX pattern where the non-translating branch renders `AppIcon` component
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern = "🌐 Übersetzen" emoji string, T.currentSourcePattern = AppIcon with lucide:globe_
    - _Expected_Behavior: Updated assertions match AppIcon pattern, test passes_
    - _Preservation: aria-label, aria-busy, min touch target, disabled={translating}, props interface, and "Übersetze…" assertions remain unchanged_
    - _Requirements: 2.6, 3.3_

  - [x] 3.7 Update `page-integration.test.ts` — delete button and "+ Neuer Song" count
    - Replace the `expect(songDetailSource).toContain("Löschen")` assertion with assertions that `SongActionMenu` is imported and rendered, and that `onDelete` is wired to `setDeleteDialogOpen(true)`
    - Change `expect(matches!.length).toBeGreaterThanOrEqual(2)` to `expect(matches!.length).toBe(1)` for the `"+ Neuer Song"` count
    - _Bug_Condition: isBugCondition(T) where T.assertionPattern ∈ {"Löschen" literal, ≥2 occurrences of "+ Neuer Song"}, T.currentSourcePattern = {SongActionMenu, 1 occurrence}_
    - _Expected_Behavior: Updated assertions match current page structure, test passes_
    - _Preservation: Component import tests (SongEditForm, SongDeleteDialog, StropheEditor), state management tests, edit button wiring, SongDeleteDialog props, StropheEditor wiring, and dashboard href assertion remain unchanged_
    - _Requirements: 2.7, 2.8, 3.2, 3.4_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Updated Test Assertions Match Current Source
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (new patterns matching current source)
    - When this test passes, it confirms the expected behavior is satisfied for all seven files
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Unaffected Test Assertions Remain Passing
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all unaffected assertions still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run all seven affected test files together to verify everything passes:
    - `npx vitest --run __tests__/cloze/completion.test.ts __tests__/cloze/dialog-strophe-order.property.test.ts __tests__/cloze/select-all-none.property.test.ts __tests__/stage/display-mode.property.test.ts __tests__/stage/song-info-overlay.test.ts __tests__/songs/translate-button.test.ts __tests__/songs/page-integration.test.ts`
  - Verify no new test failures were introduced
  - Ensure all tests pass, ask the user if questions arise
