# Stale Source-String Tests Bugfix Design

## Overview

Seven test files across three feature areas (cloze, stage, songs) are failing because they use `fs.readFileSync` to read production source files and then assert against specific string patterns, regex matches, or emoji characters that no longer exist after refactoring. The fix is purely in the test layer — each failing assertion must be updated to match the current production code patterns. No production code changes are required.

The general strategy is: for each failing test, identify the exact string/regex mismatch, update the assertion to match the current source, and verify that all unaffected assertions in the same file continue to pass.

## Glossary

- **Bug_Condition (C)**: A test assertion whose expected string/regex pattern no longer matches the current production source code due to refactoring
- **Property (P)**: After updating the assertion, the test passes against the current production source
- **Preservation**: All test assertions that were NOT affected by the refactoring continue to pass unchanged
- **Source-string test**: A test that reads a source file with `fs.readFileSync` and asserts against its content using `toContain`, `toMatch`, or occurrence counting
- **lernbareStrophen**: Filtered list of strophes that are learnable (non-instrumental), introduced during the cloze refactoring
- **strophenToUpdate**: Variable in `ClozePage` that holds the filtered strophes for progress updates (previously iterated directly from `song.strophen`)
- **SongActionMenu**: Component that now encapsulates song actions (edit, delete, analyze, translate) — previously these were inline buttons on the song detail page
- **AppIcon**: Icon component using `lucide:globe` that replaced the 🌐 emoji in `TranslateButton`
- **StageSongAnzeige**: The sole display component in the stage page after the display mode switching logic was removed

## Bug Details

### Bug Condition

The bug manifests when a source-string test asserts against a pattern that was changed during production code refactoring. The test reads the current source file but its assertion still expects the old pattern. This causes a test failure even though the production code is correct.

**Formal Specification:**
```
FUNCTION isBugCondition(T)
  INPUT: T of type TestAssertion
  OUTPUT: boolean
  
  RETURN T.assertionType IN { regex_match, string_contains, occurrence_count }
         AND T.expectedPattern ≠ actualPatternInSource(T.targetFile)
         AND T.targetFile was refactored
         AND T.testFile was NOT updated to match refactoring
END FUNCTION
```

### Examples

- **completion.test.ts**: Test expects regex `for\s*\(\s*(const|let|var)\s+\w+\s+of\s+song.*strophen\s*\)` but source has `for (const strophe of strophenToUpdate)` → test fails
- **dialog-strophe-order.property.test.ts**: Test expects `sortedStrophen\s*=\s*\[\.\.\.strophen\]\.sort\(` but source has `[...lernbareStrophen].sort(` → test fails
- **select-all-none.property.test.ts**: Test expects `strophen.map(s => s.id)` in handleSelectAll but source uses `lernbareStrophen.map(s => s.id)` → test fails
- **display-mode.property.test.ts**: Test expects `"einzelzeile"`, `"EinzelzeileAnzeige"`, `"StrophenAnzeige"`, `"settings.displayMode"` but stage page only uses `StageSongAnzeige` → tests fail
- **song-info-overlay.test.ts**: Test expects `"showSongInfo"` state, `"song.titel"`, `"song.kuenstler"`, `"3000"` (setTimeout) but overlay UI was removed from page → source-inspection tests fail
- **translate-button.test.ts**: Test expects `"🌐 Übersetzen"` and ternary with emoji string but component now uses `AppIcon` with `icon="lucide:globe"` → tests fail
- **page-integration.test.ts**: Test expects `"Löschen"` literal in song detail page but it's now in `SongActionMenu`; test expects `"+ Neuer Song"` ≥ 2 times in dashboard but only 1 occurrence exists → tests fail

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Pure function tests for `shouldShowSongInfo` (returns true/false based on songId comparison) must continue to pass
- Property-based tests for sorting stability (strophen sorted by orderIndex) must continue to pass
- Set operation tests (selectAll produces full set, deselectAll produces empty set, validation blocks zero selection) must continue to pass
- Accessibility attribute tests (`aria-label`, `aria-busy`, `aria-live`, min touch target `44px`) must continue to pass
- `SongDeleteDialog` wiring tests (`open`, `song`, `onClose`, `onDeleted` props) must continue to pass
- Completion detection logic tests (`score.correct`, `score.total`, `completionFired` ref, progress/session API calls) must continue to pass (except the iteration regex)
- Component import tests (`SongEditForm`, `SongDeleteDialog`, `StropheEditor`) must continue to pass
- State management tests (`editing`, `setEditing`, `deleteDialogOpen`, `setDeleteDialogOpen`) must continue to pass

**Scope:**
All test assertions that do NOT match the bug condition (i.e., their expected pattern still matches the current source) should be completely unaffected by this fix. Only assertions whose expected patterns diverged from the refactored source need updating.

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward across all seven files:

1. **Cloze refactoring to learnable strophes**: The cloze components were refactored to filter strophes to `lernbareStrophen` before sorting and selection. Three test files (`completion.test.ts`, `dialog-strophe-order.property.test.ts`, `select-all-none.property.test.ts`) still assert against the old variable names (`strophen`, `song.*strophen`).

2. **Stage page simplification**: The stage page was simplified to always use song mode (`StageSongAnzeige`), removing `einzelzeile`/`strophe` display modes and the song info overlay UI. Two test files (`display-mode.property.test.ts`, `song-info-overlay.test.ts`) still assert against the removed patterns.

3. **UI component modernization**: `TranslateButton` replaced the 🌐 emoji with `AppIcon` component. One test file (`translate-button.test.ts`) still expects the emoji string.

4. **Song detail page restructuring**: The "Löschen" button was moved into `SongActionMenu`, and the dashboard removed the duplicate "+ Neuer Song" link. One test file (`page-integration.test.ts`) still expects the old patterns.

## Correctness Properties

Property 1: Bug Condition - Updated Test Assertions Match Current Source

_For any_ test assertion T where the bug condition holds (the expected pattern no longer matches the production source), the updated assertion T' SHALL pass when run against the current production source code, confirming that the test now correctly validates the refactored code.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation - Unaffected Test Assertions Remain Passing

_For any_ test assertion T where the bug condition does NOT hold (the expected pattern still matches the production source), the test SHALL produce the same PASS result after the fix as it did before, preserving all existing test coverage for unchanged code patterns.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `__tests__/cloze/completion.test.ts`

**Specific Changes**:
1. **Update strophe iteration regex**: Change the regex from `for\s*\(\s*(const|let|var)\s+\w+\s+of\s+song.*strophen\s*\)` to match `for (const strophe of strophenToUpdate)` — e.g., `for\s*\(\s*const\s+strophe\s+of\s+strophenToUpdate\s*\)`

---

**File**: `__tests__/cloze/dialog-strophe-order.property.test.ts`

**Specific Changes**:
2. **Update sorting pattern regex**: Change the regex from `sortedStrophen\s*=\s*\[\.\.\.strophen\]\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.orderIndex\s*-\s*b\.orderIndex` to match `[...lernbareStrophen].sort(` — e.g., `sortedStrophen\s*=\s*\[\.\.\.lernbareStrophen\]\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.orderIndex\s*-\s*b\.orderIndex`
3. **Update iteration check**: Change `sortedStrophen.map` assertion to remain as-is (the component still uses `sortedStrophen.map` for rendering)

---

**File**: `__tests__/cloze/select-all-none.property.test.ts`

**Specific Changes**:
4. **Update handleSelectAll regex**: Change the regex from `handleSelectAll[\s\S]*?setLocalSelection\(new Set\(strophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)` to match `lernbareStrophen.map(s => s.id)` — e.g., `handleSelectAll[\s\S]*?setLocalSelection\(new Set\(lernbareStrophen\.map\(\(?s\)?\s*=>\s*s\.id\)\)\)`

---

**File**: `__tests__/stage/display-mode.property.test.ts`

**Specific Changes**:
5. **Remove or replace display mode tests**: The tests for `"einzelzeile"`, `"EinzelzeileAnzeige"`, `"StrophenAnzeige"`, and `"settings.displayMode"` should be replaced with assertions that `StageSongAnzeige` is the sole display component and that the page always renders in song mode
6. **Update the property-based test**: The `fc.constantFrom` test checking all three modes should be replaced with a test verifying only `StageSongAnzeige` is used

---

**File**: `__tests__/stage/song-info-overlay.test.ts`

**Specific Changes**:
7. **Remove overlay source-inspection tests**: Remove the `"Song-Info-Overlay Quellcode-Inspektion"` describe block that checks for `showSongInfo` state, `song.titel`, `song.kuenstler`, `3000` (setTimeout), and `aria-live` in the page source — these patterns no longer exist in the page
8. **Preserve pure function tests**: Keep the `"shouldShowSongInfo"` describe block unchanged since the function is still exported and works correctly

---

**File**: `__tests__/songs/translate-button.test.ts`

**Specific Changes**:
9. **Update button text assertion**: Change `expect(source).toContain("🌐 Übersetzen")` to check for `AppIcon` usage with `icon="lucide:globe"` and the string `"Übersetzen"` (without emoji)
10. **Update ternary assertion**: Change the regex `translating\s*\?\s*"Übersetze…"\s*:\s*"🌐 Übersetzen"` to match the current JSX pattern where the non-translating branch renders a JSX fragment with `AppIcon` and `Übersetzen`

---

**File**: `__tests__/songs/page-integration.test.ts`

**Specific Changes**:
11. **Update delete button test**: Replace the assertion for literal `"Löschen"` in the song detail source with assertions that `SongActionMenu` is imported and rendered, and that `onDelete` is wired to `setDeleteDialogOpen(true)`
12. **Update "+ Neuer Song" count**: Change the assertion from `expect(matches!.length).toBeGreaterThanOrEqual(2)` to `expect(matches!.length).toBe(1)` since the dashboard now has only one occurrence

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (the current failing tests serve as counterexamples), then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Run all seven affected test files against the current (unfixed) test code to observe failures and confirm which specific assertions fail. This validates our root cause analysis.

**Test Cases**:
1. **completion.test.ts iteration regex**: Run test, expect failure on "iterates over strophen to PUT progress for each" (will fail on unfixed code)
2. **dialog-strophe-order sorting regex**: Run test, expect failure on "component sorts strophen by orderIndex ascending" (will fail on unfixed code)
3. **select-all-none handleSelectAll regex**: Run test, expect failure on "handleSelectAll sets localSelection to all strophe IDs" (will fail on unfixed code)
4. **display-mode all three modes**: Run test, expect failures on einzelzeile/strophe/displayMode assertions (will fail on unfixed code)
5. **song-info-overlay source inspection**: Run test, expect failures on showSongInfo state/titel/kuenstler/3000 assertions (will fail on unfixed code)
6. **translate-button emoji assertions**: Run test, expect failures on 🌐 emoji and ternary assertions (will fail on unfixed code)
7. **page-integration Löschen and + Neuer Song**: Run test, expect failures on "Löschen" literal and ≥2 count assertions (will fail on unfixed code)

**Expected Counterexamples**:
- Each test will fail with `expect(source).toContain(...)` or `expect(source).toMatch(...)` errors showing the expected pattern was not found in the source
- Possible causes confirmed: variable renaming, component replacement, feature removal, UI restructuring

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed tests produce PASS results.

**Pseudocode:**
```
FOR ALL T WHERE isBugCondition(T) DO
  T' := updateAssertion(T, currentSourcePattern)
  result := runTest(T')
  ASSERT result = PASS
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the tests produce the same PASS result as before.

**Pseudocode:**
```
FOR ALL T WHERE NOT isBugCondition(T) DO
  ASSERT runTest(T) = runTest(T')  // unchanged assertions still pass
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It can systematically verify that all unaffected assertions in each test file still pass
- It catches accidental regressions where an unrelated assertion was inadvertently broken
- It provides strong guarantees that the fix is minimal and targeted

**Test Plan**: Run the full test suite for all seven files after applying fixes. Every assertion that was not modified should produce the same result as before.

**Test Cases**:
1. **Pure function preservation**: Verify `shouldShowSongInfo` tests still pass unchanged
2. **Sorting stability preservation**: Verify property-based sorting tests still pass unchanged
3. **Set operation preservation**: Verify selectAll/deselectAll/validation property tests still pass unchanged
4. **Accessibility preservation**: Verify aria-label, aria-busy, min touch target tests still pass unchanged
5. **Component wiring preservation**: Verify SongDeleteDialog, SongEditForm, StropheEditor import/wiring tests still pass unchanged
6. **Completion logic preservation**: Verify completionFired, score detection, API call pattern tests still pass unchanged

### Unit Tests

- Run each of the seven test files individually after applying fixes
- Verify each previously-failing assertion now passes
- Verify each previously-passing assertion still passes
- Check that no new test failures are introduced

### Property-Based Tests

- The existing property-based tests in `dialog-strophe-order.property.test.ts` (sorting stability, ascending order) should continue to pass since they test pure logic, not source patterns
- The existing property-based tests in `select-all-none.property.test.ts` (set operations) should continue to pass since they test pure logic
- The existing property-based test in `display-mode.property.test.ts` needs updating since it tests source patterns that changed

### Integration Tests

- Run the complete test suite across all seven files to verify no cross-file regressions
- Verify that the test files still correctly validate the production code they are meant to cover
- Confirm that the updated assertions accurately reflect the current production code patterns
