# Bugfix Requirements Document

## Introduction

Multiple source-code-inspecting tests are failing because the production code was refactored but the test assertions were not updated to match the new code patterns. These tests use `fs.readFileSync` to read source files and then match against specific strings, regex patterns, or emoji characters that no longer exist in the refactored code. The tests themselves are not testing runtime behavior — they validate that certain patterns exist in the source code. The fix requires updating each test's assertions to match the current production code, or removing tests whose validated feature was intentionally removed.

Seven test files across three feature areas (cloze, stage, songs) are affected, totaling approximately 15 individual failing test cases.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the test in `completion.test.ts` checks for the regex `for\s*\(\s*(const|let|var)\s+\w+\s+of\s+song.*strophen\s*\)` THEN the test fails because the production code now uses `for (const strophe of strophenToUpdate)` — the loop variable and iterable were renamed during refactoring to only iterate active strophes

1.2 WHEN the test in `dialog-strophe-order.property.test.ts` checks for the regex `sortedStrophen\s*=\s*\[\.\.\.strophen\]\.sort\(` THEN the test fails because the production code now uses `[...lernbareStrophen].sort(` — the component filters to learnable strophes before sorting

1.3 WHEN the test in `select-all-none.property.test.ts` checks for the regex `handleSelectAll[\s\S]*?setLocalSelection\(new Set\(strophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)` THEN the test fails because the production code now uses `lernbareStrophen.map(s => s.id)` instead of `strophen.map(s => s.id)`

1.4 WHEN the tests in `display-mode.property.test.ts` check that the stage page source contains `"einzelzeile"`, `"EinzelzeileAnzeige"`, `"StrophenAnzeige"`, or `"settings.displayMode"` THEN the tests fail because the stage page was refactored to always use song mode (`StageSongAnzeige`) and no longer contains display mode switching logic

1.5 WHEN the tests in `song-info-overlay.test.ts` check that the stage page source contains `"showSongInfo"` state, `"song.titel"`, `"song.kuenstler"`, or `"3000"` (setTimeout) THEN the tests fail because the song info overlay UI was removed from the page — the `shouldShowSongInfo` function still exists but the overlay rendering and associated state were removed

1.6 WHEN the tests in `translate-button.test.ts` check for `"🌐 Übersetzen"` and the regex `translating\s*\?\s*"Übersetze…"\s*:\s*"🌐 Übersetzen"` THEN the tests fail because the component now uses `AppIcon` component with `icon="lucide:globe"` instead of the 🌐 emoji, and the ternary renders a JSX fragment rather than a plain string

1.7 WHEN the test in `page-integration.test.ts` checks that the song detail page source contains `"Löschen"` THEN the test fails because the "Löschen" action was moved into the `SongActionMenu` component — the song detail page itself no longer contains the literal string "Löschen"

1.8 WHEN the test in `page-integration.test.ts` checks that `"+ Neuer Song"` appears at least twice in the dashboard source THEN the test fails because the dashboard was restructured — the empty state for the "Ohne Set" section no longer shows a duplicate "+ Neuer Song" link

### Expected Behavior (Correct)

2.1 WHEN the test in `completion.test.ts` checks for the strophe iteration pattern THEN the test SHALL use a regex that matches `for (const strophe of strophenToUpdate)` — the current pattern where only active/selected strophes are iterated for progress updates

2.2 WHEN the test in `dialog-strophe-order.property.test.ts` checks for the sorting pattern THEN the test SHALL use a regex that matches `[...lernbareStrophen].sort(` — reflecting that the component now filters to learnable strophes before sorting

2.3 WHEN the test in `select-all-none.property.test.ts` checks for the handleSelectAll pattern THEN the test SHALL use a regex that matches `lernbareStrophen.map(s => s.id)` — reflecting that select-all now operates on learnable strophes only

2.4 WHEN the tests in `display-mode.property.test.ts` validate the stage page THEN the tests SHALL be updated to reflect that the page always uses song mode — tests for `"einzelzeile"`, `"EinzelzeileAnzeige"`, `"StrophenAnzeige"`, and `"settings.displayMode"` SHALL be removed or replaced with assertions that `StageSongAnzeige` is the sole display component

2.5 WHEN the tests in `song-info-overlay.test.ts` validate the stage page source THEN the source-inspection tests for `"showSongInfo"` state, `"song.titel"`, `"song.kuenstler"`, and `"3000"` (setTimeout) SHALL be removed since the overlay UI no longer exists in the page — the pure function tests for `shouldShowSongInfo` SHALL be preserved since that function is still exported

2.6 WHEN the tests in `translate-button.test.ts` validate the button text THEN the tests SHALL check for `AppIcon` usage with `icon="lucide:globe"` and the string `"Übersetzen"` (without emoji), and the ternary test SHALL match the current JSX pattern using `AppIcon` instead of the emoji string

2.7 WHEN the test in `page-integration.test.ts` validates the delete button THEN the test SHALL verify that `SongActionMenu` is imported and rendered (since "Löschen" is now delegated to that component), and SHALL check that `onDelete` callback is wired to `setDeleteDialogOpen(true)`

2.8 WHEN the test in `page-integration.test.ts` validates the "+ Neuer Song" link on the dashboard THEN the test SHALL expect exactly one occurrence of `"+ Neuer Song"` since the dashboard no longer duplicates it in an empty state

### Unchanged Behavior (Regression Prevention)

3.1 WHEN tests validate pure logic (e.g., `shouldShowSongInfo` function behavior, property-based tests for sorting stability, select-all/deselect-all set operations) THEN the system SHALL CONTINUE TO pass those tests unchanged since the underlying logic has not changed

3.2 WHEN tests validate component imports, state management patterns, or API call patterns that were not affected by the refactoring THEN the system SHALL CONTINUE TO pass those assertions unchanged

3.3 WHEN tests validate accessibility attributes (`aria-label`, `aria-busy`, `aria-live`, minimum touch target sizes) THEN the system SHALL CONTINUE TO pass those assertions unchanged since accessibility requirements were preserved during refactoring

3.4 WHEN tests validate the `SongDeleteDialog` rendering with `open`, `song`, `onClose`, and `onDeleted` props THEN the system SHALL CONTINUE TO pass those assertions unchanged since the dialog component and its wiring were not changed

3.5 WHEN tests validate the completion detection logic (`score.correct`, `score.total`, `completionFired` ref, progress API calls, session API calls) THEN the system SHALL CONTINUE TO pass those assertions unchanged since only the iteration variable name changed, not the completion logic itself

---

### Bug Condition

```pascal
FUNCTION isBugCondition(T)
  INPUT: T of type TestAssertion
  OUTPUT: boolean
  
  // Returns true when a test assertion matches a source code pattern
  // that was changed during production code refactoring
  RETURN T.assertionPattern ≠ T.currentSourcePattern
    AND T.assertionType ∈ { regex_match, string_contains, occurrence_count }
    AND T.targetFile was refactored
END FUNCTION
```

### Property Specification

```pascal
// Property: Fix Checking — Updated tests match current source code
FOR ALL T WHERE isBugCondition(T) DO
  result ← runTest(T')  // T' = updated test assertion
  ASSERT result = PASS
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking — Unaffected tests remain passing
FOR ALL T WHERE NOT isBugCondition(T) DO
  ASSERT runTest(T) = runTest(T')  // unchanged tests produce same result
END FOR
```
