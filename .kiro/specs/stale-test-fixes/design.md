# Stale Test Fixes Bugfix Design

## Overview

41 tests across 16 test files are failing because their mocks and assertions have drifted from the current production code. The application code is correct — all failures are in the test layer. The fix strategy is to update each test to match the actual implementation without changing any production behavior, except for two cases (1.9, 1.10) where production components need `aria-label` attributes added to satisfy accessibility requirements.

The 13 requirements group into 9 distinct root causes. Each group requires a targeted, minimal fix in either the test file or (for accessibility) the production component.

## Glossary

- **Bug_Condition (C)**: A test file whose mocks, generators, or assertions no longer match the production code it exercises
- **Property (P)**: After the fix, every affected test passes and correctly validates the behavior described in its docstring
- **Preservation**: All currently-passing tests continue to pass; no production behavior changes (except adding `aria-label` attributes where required)
- **Stale mock**: A `vi.mock` / `vi.fn` setup that is missing a method or field the production code now calls
- **Stale assertion**: A `toThrow`, `toMatch`, or `toEqual` expectation that no longer matches the production code's actual output
- **arbThemeColors**: The fast-check arbitrary in `serializer-roundtrip.property.test.ts` that generates `ThemeColors` objects

## Bug Details

### Bug Condition

The bug manifests when any of the 16 affected test files are executed. Each test calls production code that has evolved since the test was written, causing a mismatch between what the test expects and what the code does.

**Formal Specification:**
```
FUNCTION isBugCondition(testFile)
  INPUT: testFile — a test file path
  OUTPUT: boolean

  RETURN testFile IN [
    "response-validation.property.test.ts",
    "access-control.property.test.ts",
    "concurrency-guard.property.test.ts",
    "error-logging.property.test.ts",
    "analysis-overwrite.property.test.ts",
    "analysis-roundtrip.property.test.ts",
    "set-delete-preserves-songs.property.test.ts",
    "set-song-association.property.test.ts",
    "song-cascade-delete.property.test.ts",
    "dashboard-metriken.test.ts",
    "serializer-roundtrip.property.test.ts",
    "aria-attributes.property.test.ts",
    "song-accessibility.property.test.ts",
    "song-card-grid-responsive.property.test.ts",
    "bundle-api.property.test.ts",
    "etag-determinism.property.test.ts"
  ]
END FUNCTION
```

### Examples

- **Group 1 (Req 1.1)**: `response-validation.property.test.ts` — test expects `validateAnalyseResponse` to throw on strophen count mismatch, but the function now only logs `console.warn` and tolerates it
- **Group 2 (Req 1.2)**: 5 smart-analysis tests — `analyzeSong()` calls `prisma.user.findUnique` for the user's `sprache`, but no test mocks `prisma.user`, causing `Cannot read properties of undefined`
- **Group 3 (Req 1.3)**: 2 set tests — `addSongToSet()` calls `prisma.setSong.aggregate()` for `orderIndex`, but mocks only define `create`/`deleteMany`
- **Group 4 (Req 1.4)**: `song-cascade-delete.property.test.ts` — mock `findUnique` returns zeilen without `markups` arrays, causing `.map()` on undefined
- **Group 5 (Req 1.5)**: `dashboard-metriken.test.ts` — route imports `getEmpfangeneFreigaben` from `freigabe-service`, but test doesn't mock it, causing 500
- **Group 6 (Req 1.6)**: `serializer-roundtrip.property.test.ts` — `arbThemeColors` generates 17 fields but `ThemeColors` now has 25 fields, so `deserializeTheme` fills defaults, breaking `deepEqual`
- **Group 7 (Req 1.7, 1.8)**: `aria-attributes.property.test.ts` — `RevealLine` uses conditional rendering instead of `aria-hidden`; `StropheCard` uses `role="switch"` with a different `aria-label` template
- **Group 8 (Req 1.9, 1.10)**: `song-accessibility.property.test.ts` — `Link` elements in `SongDetailPage` and a `button` in `SetCard` lack `aria-label` attributes (production fix needed)
- **Group 9 (Req 1.11–1.13)**: Grid test expects wrong Tailwind classes; stage bundle/ETag tests have mock strophen missing `markups` arrays

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All 200+ currently-passing tests continue to pass
- `validateAnalyseResponse` continues to throw on invalid JSON, missing fields, wrong types, and structural errors
- `analyzeSong` continues to enforce ownership (403), concurrency guard (409), and return consistent `SongAnalyseResult`
- `addSongToSet`/`removeSongFromSet` continue to correctly manage set-song associations
- `deleteSong` continues to cascade-delete all related records
- Dashboard API continues to return all `DashboardData` fields
- `serializeTheme`/`deserializeTheme` roundtrip continues to produce deep-equal results
- ARIA attributes on `ModeTabs`, `InterpretationTab`, `NotesTab` remain correct
- `SongCardGrid` continues to render one `SongCard` per song
- Stage bundle API continues to return songs, sets, strophen, zeilen with ETag header
- ETag computation remains deterministic

**Scope:**
Only the 16 listed test files are modified. Production code changes are limited to adding `aria-label` attributes on `Link` elements in `SongDetailPage` and the expand/collapse `button` in `SetCard`.

## Hypothesized Root Cause

Each group has a clear, verifiable root cause:

1. **Strophen count mismatch tolerance (Req 1.1)**: `validateAnalyseResponse` was changed from throwing to `console.warn` for count mismatches. The test still expects a throw.

2. **Missing `prisma.user` mock (Req 1.2)**: `analyzeSong` added a `prisma.user.findUnique` call to load the user's `sprache` preference. The 5 smart-analysis test files mock `prisma.song` but not `prisma.user`.

3. **Missing `prisma.setSong.aggregate` mock (Req 1.3)**: `addSongToSet` added an `aggregate` call to determine the next `orderIndex`. The 2 set test files mock `create`/`deleteMany` on `setSong` but not `aggregate`.

4. **Incomplete mock data — missing `markups` on zeilen (Req 1.4)**: `getSongDetail` (via `findUnique`) now includes `zeilen.markups`. The cascade-delete test's in-memory mock returns zeilen without `markups` arrays.

5. **Missing `freigabe-service` mock (Req 1.5)**: The dashboard route added `getEmpfangeneFreigaben(userId)`. The dashboard test doesn't mock `@/lib/services/freigabe-service`.

6. **Stale `arbThemeColors` generator (Req 1.6)**: `ThemeColors` gained 8 new fields (`pillTag`, `headlineColor`, `copyColor`, `labelColor`, `linkColor`, `mutedColor`, `buttonTextColor`, `iconColor`). The test generator only produces the original 17 fields.

7. **Changed component patterns (Req 1.7, 1.8)**: `RevealLine` switched from `aria-hidden` to conditional rendering. `StropheCard` switched from a plain button to `role="switch"` with conditional `aria-label` text. The test's regex and checks don't match.

8. **Missing `aria-label` on production components (Req 1.9, 1.10)**: `SongDetailPage` has 7 `Link` elements without `aria-label`. `SetCard` has a `button` without `aria-label`. The accessibility test correctly flags these.

9. **Stale grid classes and missing `markups` in stage mocks (Req 1.11–1.13)**: `SongCardGrid` uses `grid-cols-2` not `grid-cols-1 sm:grid-cols-2`. Stage bundle/ETag test generators produce strophen without `markups` arrays, but the route accesses `strophe.markups[0]?.timecodeMs`.

## Correctness Properties

Property 1: Bug Condition - All 41 Previously-Failing Tests Pass

_For any_ test file in the bug condition set (the 16 affected files), running the test suite SHALL produce 0 failures — every test case passes with updated mocks, generators, and assertions matching the current production code.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13**

Property 2: Preservation - All Previously-Passing Tests Continue to Pass

_For any_ test file NOT in the bug condition set, running the full test suite SHALL produce the same pass/fail result as before the fix, preserving all existing test coverage and production behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**

## Fix Implementation

### Changes Required

#### Group 1: Strophen Count Mismatch Tolerance (Req 1.1)

**File**: `__tests__/smart-analysis/response-validation.property.test.ts`

**Change**: Replace the last test case ("rejects when strophen count does not match expected") — instead of expecting a throw, assert that the function returns successfully (tolerates the mismatch) and optionally spy on `console.warn` to verify the warning is logged.

#### Group 2: Missing `prisma.user` Mock (Req 1.2)

**Files**: 5 smart-analysis test files:
- `__tests__/smart-analysis/access-control.property.test.ts`
- `__tests__/smart-analysis/concurrency-guard.property.test.ts`
- `__tests__/smart-analysis/error-logging.property.test.ts`
- `__tests__/smart-analysis/analysis-overwrite.property.test.ts`
- `__tests__/smart-analysis/analysis-roundtrip.property.test.ts`

**Change**: In each file's `vi.mock("@/lib/prisma", ...)` block, add `user: { findUnique: vi.fn() }` to the mock prisma object. In the test setup (or `beforeEach`), configure `prisma.user.findUnique` to return `{ sprache: "Deutsch" }`.

#### Group 3: Missing `prisma.setSong.aggregate` Mock (Req 1.3)

**Files**:
- `__tests__/songs/set-delete-preserves-songs.property.test.ts`
- `__tests__/songs/set-song-association.property.test.ts`

**Change**: Add `aggregate: vi.fn()` to the `setSong` mock object. In `setupMocks()`, configure `prisma.setSong.aggregate` to return `{ _max: { orderIndex: null } }` (or a computed value based on in-memory state).

#### Group 4: Incomplete Mock Data — Missing `markups` on Zeilen (Req 1.4)

**File**: `__tests__/songs/song-cascade-delete.property.test.ts`

**Change**: The `mockedSongFindUnique` implementation already builds zeilen with `markups` from the in-memory store. Verify the mock returns `markups: [...]` on each zeile. The in-memory store already tracks markups by `zeileId`, so the existing implementation should work. If the issue is that `fortschritte` and `notizen` arrays are missing on zeilen (not strophen), add `fortschritte: []` and `notizen: []` to each zeile in the mock's return value.

#### Group 5: Missing `freigabe-service` Mock (Req 1.5)

**File**: `__tests__/gamification/dashboard-metriken.test.ts`

**Change**: Add a hoisted mock for `getEmpfangeneFreigaben`:
```typescript
const { mockGetEmpfangeneFreigaben } = vi.hoisted(() => ({
  mockGetEmpfangeneFreigaben: vi.fn(),
}));
vi.mock("@/lib/services/freigabe-service", () => ({
  getEmpfangeneFreigaben: mockGetEmpfangeneFreigaben,
}));
```
In `setupMocks()`, add `mockGetEmpfangeneFreigaben.mockResolvedValue({ sets: [], songs: [] })`.

#### Group 6: Stale `arbThemeColors` Generator (Req 1.6)

**File**: `__tests__/theming/serializer-roundtrip.property.test.ts`

**Change**: Add the 8 missing fields to `arbThemeColors`:
```typescript
const arbThemeColors: fc.Arbitrary<ThemeColors> = fc.record({
  // ... existing 17 fields ...
  pillTag: arbHexColor,
  headlineColor: arbHexColor,
  copyColor: arbHexColor,
  labelColor: arbHexColor,
  linkColor: arbHexColor,
  mutedColor: arbHexColor,
  buttonTextColor: arbHexColor,
  iconColor: arbHexColor,
});
```

#### Group 7: Changed Component Patterns (Req 1.7, 1.8)

**File**: `__tests__/emotional/aria-attributes.property.test.ts`

**Changes**:
1. **RevealLine check (Req 1.7)**: Replace the `revealLine-aria-hidden` ARIA check. Instead of checking for `aria-hidden`, verify that the component uses conditional rendering (the translation `<p>` is only rendered when `isRevealed` is true). Update the validate function to check for a conditional rendering pattern like `&& isRevealed &&` or `{hasTranslation && isRevealed &&`.
2. **StropheCard check (Req 1.8)**: Update the `stropheCard-reveal-all-aria-label` check and the corresponding unit test. The button now uses `role="switch"` with `aria-checked` and an `aria-label` that includes conditional "aufdecken"/"ausblenden" text. Update the regex to match the actual template: `` aria-label={`...${strophe.name}...`} `` with "aufdecken" or "ausblenden".

#### Group 8: Missing `aria-label` on Production Components (Req 1.9, 1.10)

**File 1**: `src/app/(main)/songs/[id]/page.tsx`

**Change**: Add `aria-label` attributes to the 5 learning-mode `Link` elements that lack them:
- Lesemodus → `aria-label="Lesemodus öffnen"`
- Inhalt & Bedeutung → `aria-label="Inhalt und Bedeutung öffnen"`
- Gesangstechnik-Coach → `aria-label="Gesangstechnik-Coach öffnen"`
- Quiz → `aria-label="Quiz öffnen"`
- Lückentext → `aria-label="Lückentext öffnen"`
- Zeile für Zeile → `aria-label="Zeile für Zeile öffnen"`
- Rückwärts lernen → `aria-label="Rückwärts lernen öffnen"`

Also add `aria-label` to the set pill `Link` elements: `aria-label={`Set „${s.name}" öffnen`}`.

**File 2**: `src/components/songs/set-card.tsx`

**Change**: Add `aria-label` to the expand/collapse `<button>`:
```tsx
aria-label={expanded ? `Set „${set.name}" einklappen` : `Set „${set.name}" aufklappen`}
```

#### Group 9: Stale Grid Classes and Missing `markups` in Stage Mocks (Req 1.11–1.13)

**File 1**: `__tests__/songs/song-card-grid-responsive.property.test.ts`

**Change**: Update `EXPECTED_GRID_CLASSES` to match the actual component:
```typescript
const EXPECTED_GRID_CLASSES = [
  "grid",
  "grid-cols-2",
  "md:grid-cols-3",
  "lg:grid-cols-4",
  "gap-4",
];
```
Remove `"grid-cols-1"` and `"sm:grid-cols-2"`.

**File 2**: `__tests__/stage/bundle-api.property.test.ts`

**Change**: Add `markups` to the `stropheArb` generator:
```typescript
const stropheArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 10 }),
  zeilen: fc.array(zeileArb, { minLength: 0, maxLength: 5 }),
  markups: fc.constant([]),
});
```

**File 3**: `__tests__/stage/etag-determinism.property.test.ts`

**Change**: Add `markups` to the `stropheArb` generator:
```typescript
const stropheArb = fc.record({
  id: idArb,
  name: fc.string({ minLength: 1, maxLength: 20 }),
  orderIndex: fc.nat({ max: 5 }),
  zeilen: fc.array(zeileArb, { minLength: 0, maxLength: 3 }),
  markups: fc.constant([]),
});
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm each test fails on the unfixed code (establishing the bug condition), then verify all tests pass after the fix while preserving existing passing tests.

### Exploratory Bug Condition Checking

**Goal**: Confirm that all 41 tests fail on the current unfixed code and that the failures match the hypothesized root causes.

**Test Plan**: Run each of the 16 affected test files individually and verify the error messages match expectations. This confirms the root cause analysis before applying fixes.

**Test Cases**:
1. **Response validation test**: Run `response-validation.property.test.ts` — expect failure on "rejects when strophen count does not match" (will fail on unfixed code)
2. **Smart-analysis tests**: Run all 5 files — expect `Cannot read properties of undefined (reading 'findUnique')` from missing `prisma.user` (will fail on unfixed code)
3. **Set tests**: Run both set test files — expect failure from missing `aggregate` method (will fail on unfixed code)
4. **Cascade delete test**: Run `song-cascade-delete.property.test.ts` — expect `.map()` on undefined from missing `markups` (will fail on unfixed code)
5. **Dashboard test**: Run `dashboard-metriken.test.ts` — expect 500 status from unmocked `freigabe-service` (will fail on unfixed code)
6. **Serializer roundtrip test**: Run `serializer-roundtrip.property.test.ts` — expect `deepEqual` failure from missing ThemeColors fields (will fail on unfixed code)
7. **ARIA attributes test**: Run `aria-attributes.property.test.ts` — expect failures on RevealLine and StropheCard checks (will fail on unfixed code)
8. **Song accessibility test**: Run `song-accessibility.property.test.ts` — expect failures on Link and button aria-label checks (will fail on unfixed code)
9. **Grid and stage tests**: Run grid-responsive, bundle-api, etag-determinism tests — expect class mismatch and 500 errors (will fail on unfixed code)

**Expected Counterexamples**:
- `TypeError: Cannot read properties of undefined (reading 'findUnique')` — missing `prisma.user`
- `TypeError: prisma.setSong.aggregate is not a function` — missing `aggregate` mock
- `Expected: 200, Received: 500` — missing `freigabe-service` mock
- `deepEqual` failure with default-filled fields — stale `arbThemeColors`
- `ARIA check failed` — changed component patterns

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed tests pass.

**Pseudocode:**
```
FOR ALL testFile WHERE isBugCondition(testFile) DO
  result := runVitest(testFile)
  ASSERT result.failures == 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the full test suite produces the same results.

**Pseudocode:**
```
FOR ALL testFile WHERE NOT isBugCondition(testFile) DO
  ASSERT runVitest(testFile).failures == previousRun(testFile).failures
END FOR
```

**Testing Approach**: Run the full test suite after all fixes are applied. Compare the total pass/fail counts with the pre-fix run. The only changes should be the 41 previously-failing tests now passing.

**Test Plan**: Run the complete vitest suite and verify:
1. All 41 previously-failing tests now pass
2. No previously-passing tests have regressed

**Test Cases**:
1. **Full suite run**: `npx vitest --run` — verify 0 failures
2. **Individual group verification**: Run each of the 16 affected files individually to confirm all pass
3. **Production component verification**: Verify `SongDetailPage` and `SetCard` render correctly with new `aria-label` attributes

### Unit Tests

- Verify each mock addition (prisma.user, setSong.aggregate, freigabe-service) is correctly wired
- Verify the updated `arbThemeColors` generator produces all 25 ThemeColors fields
- Verify the updated ARIA checks match the actual component patterns
- Verify the updated grid class expectations match the actual component

### Property-Based Tests

- The serializer roundtrip PBT with the updated generator covers all 25 ThemeColors fields
- The ARIA attributes PBT with updated checks covers the new component patterns
- The grid responsive PBT with corrected classes validates the actual layout
- The stage bundle/ETag PBTs with `markups` in generators validate the route handles data correctly

### Integration Tests

- Run the full test suite to verify no cross-test regressions
- Verify the dashboard API test correctly mocks all service dependencies
- Verify the smart-analysis tests correctly exercise the full `analyzeSong` flow with `prisma.user`
