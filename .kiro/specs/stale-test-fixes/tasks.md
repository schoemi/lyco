# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - All 41 Previously-Failing Tests Fail on Unfixed Code
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists across all 9 groups
  - **Scoped PBT Approach**: Run each of the 16 affected test files individually to confirm failures match hypothesized root causes
  - Write a test runner script or vitest config that executes all 16 affected test files:
    - `__tests__/smart-analysis/response-validation.property.test.ts` — expect failure on strophen count mismatch test (Req 1.1)
    - `__tests__/smart-analysis/access-control.property.test.ts` — expect `Cannot read properties of undefined (reading 'findUnique')` from missing `prisma.user` (Req 1.2)
    - `__tests__/smart-analysis/concurrency-guard.property.test.ts` — same missing `prisma.user` error (Req 1.2)
    - `__tests__/smart-analysis/error-logging.property.test.ts` — same missing `prisma.user` error (Req 1.2)
    - `__tests__/smart-analysis/analysis-overwrite.property.test.ts` — same missing `prisma.user` error (Req 1.2)
    - `__tests__/smart-analysis/analysis-roundtrip.property.test.ts` — same missing `prisma.user` error (Req 1.2)
    - `__tests__/songs/set-delete-preserves-songs.property.test.ts` — expect `aggregate is not a function` (Req 1.3)
    - `__tests__/songs/set-song-association.property.test.ts` — expect `aggregate is not a function` (Req 1.3)
    - `__tests__/songs/song-cascade-delete.property.test.ts` — expect `.map()` on undefined from missing `markups` (Req 1.4)
    - `__tests__/gamification/dashboard-metriken.test.ts` — expect 500 from unmocked `freigabe-service` (Req 1.5)
    - `__tests__/theming/serializer-roundtrip.property.test.ts` — expect `deepEqual` failure from missing ThemeColors fields (Req 1.6)
    - `__tests__/emotional/aria-attributes.property.test.ts` — expect failures on RevealLine and StropheCard checks (Req 1.7, 1.8)
    - `__tests__/songs/song-accessibility.property.test.ts` — expect failures on Link and button aria-label checks (Req 1.9, 1.10)
    - `__tests__/songs/song-card-grid-responsive.property.test.ts` — expect class mismatch (Req 1.11)
    - `__tests__/stage/bundle-api.property.test.ts` — expect 500 from missing `markups` (Req 1.12)
    - `__tests__/stage/etag-determinism.property.test.ts` — expect 500 from missing `markups` (Req 1.13)
  - Run all 16 test files on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (error messages, failure counts per group)
  - Mark task complete when tests are run and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - All Previously-Passing Tests Continue to Pass
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Run the full test suite on UNFIXED code and record the pass/fail baseline
  - Identify all currently-passing test files (those NOT in the 16 affected files)
  - Record the total number of passing tests as the preservation baseline
  - Write a preservation check that runs the full test suite excluding the 16 affected files
  - Verify all non-affected tests pass on UNFIXED code — this establishes the preservation baseline
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when preservation baseline is established and documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

- [ ] 3. Fix Group 1: Strophen Count Mismatch Tolerance (Req 1.1)

  - [x] 3.1 Update response-validation test to expect tolerant behavior
    - File: `__tests__/smart-analysis/response-validation.property.test.ts`
    - Replace the last test case ("rejects when strophen count does not match expected")
    - Instead of expecting a throw, assert that the function returns successfully (tolerates the mismatch)
    - Optionally spy on `console.warn` to verify the warning is logged
    - _Bug_Condition: isBugCondition("response-validation.property.test.ts") — test expects throw but implementation only warns_
    - _Expected_Behavior: Test SHALL expect tolerant behavior (no throw, only console.warn)_
    - _Preservation: validateAnalyseResponse continues to throw on invalid JSON, missing fields, wrong types_
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Verify Group 1 test passes
    - **Property 1: Expected Behavior** - Response Validation Strophen Count Tolerance
    - **IMPORTANT**: Re-run `__tests__/smart-analysis/response-validation.property.test.ts` — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms fix works)
    - _Requirements: 2.1_

- [ ] 4. Fix Group 2: Missing `prisma.user` Mock (Req 1.2)

  - [x] 4.1 Add `prisma.user.findUnique` mock to all 5 smart-analysis test files
    - Files:
      - `__tests__/smart-analysis/access-control.property.test.ts`
      - `__tests__/smart-analysis/concurrency-guard.property.test.ts`
      - `__tests__/smart-analysis/error-logging.property.test.ts`
      - `__tests__/smart-analysis/analysis-overwrite.property.test.ts`
      - `__tests__/smart-analysis/analysis-roundtrip.property.test.ts`
    - In each file's `vi.mock("@/lib/prisma", ...)` block, add `user: { findUnique: vi.fn() }` to the mock prisma object
    - In the test setup (or `beforeEach`), configure `prisma.user.findUnique` to return `{ sprache: "Deutsch" }`
    - _Bug_Condition: analyzeSong() calls prisma.user.findUnique but no test mocks prisma.user_
    - _Expected_Behavior: Tests SHALL include prisma.user mock returning { sprache: "Deutsch" }_
    - _Preservation: analyzeSong continues to enforce ownership (403), concurrency guard (409), and return consistent SongAnalyseResult_
    - _Requirements: 1.2, 2.2, 3.2, 3.3, 3.4_

  - [x] 4.2 Verify Group 2 tests pass
    - **Property 1: Expected Behavior** - Smart Analysis prisma.user Mock
    - **IMPORTANT**: Re-run all 5 smart-analysis test files — do NOT write new tests
    - **EXPECTED OUTCOME**: All 5 files PASS (confirms fix works)
    - _Requirements: 2.2_

- [ ] 5. Fix Group 3: Missing `prisma.setSong.aggregate` Mock (Req 1.3)

  - [x] 5.1 Add `aggregate` mock to set test files
    - Files:
      - `__tests__/songs/set-delete-preserves-songs.property.test.ts`
      - `__tests__/songs/set-song-association.property.test.ts`
    - Add `aggregate: vi.fn()` to the `setSong` mock object in each file
    - In `setupMocks()` or `beforeEach`, configure `prisma.setSong.aggregate` to return `{ _max: { orderIndex: null } }`
    - _Bug_Condition: addSongToSet() calls prisma.setSong.aggregate() but mocks only define create/deleteMany_
    - _Expected_Behavior: Tests SHALL include aggregate mock returning { _max: { orderIndex: null } }_
    - _Preservation: addSongToSet/removeSongFromSet continue to correctly manage set-song associations_
    - _Requirements: 1.3, 2.3, 3.5_

  - [x] 5.2 Verify Group 3 tests pass
    - **Property 1: Expected Behavior** - Set Song Aggregate Mock
    - **IMPORTANT**: Re-run both set test files — do NOT write new tests
    - **EXPECTED OUTCOME**: Both files PASS (confirms fix works)
    - _Requirements: 2.3_

- [ ] 6. Fix Group 4: Missing `markups` on Zeilen in Cascade Delete Mock (Req 1.4)

  - [x] 6.1 Add `markups`, `fortschritte`, and `notizen` arrays to zeilen in mock data
    - File: `__tests__/songs/song-cascade-delete.property.test.ts`
    - Ensure the mock's `findUnique` returns strophen with zeilen that include `markups: []`, `fortschritte: []`, and `notizen: []`
    - _Bug_Condition: Mock findUnique returns zeilen without markups arrays, causing .map() on undefined_
    - _Expected_Behavior: Mock SHALL return zeilen with markups: [], fortschritte: [], notizen: []_
    - _Preservation: deleteSong continues to cascade-delete all related records_
    - _Requirements: 1.4, 2.4, 3.6_

  - [x] 6.2 Verify Group 4 test passes
    - **Property 1: Expected Behavior** - Cascade Delete Markups Mock
    - **IMPORTANT**: Re-run `__tests__/songs/song-cascade-delete.property.test.ts` — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms fix works)
    - _Requirements: 2.4_

- [ ] 7. Fix Group 5: Missing `freigabe-service` Mock (Req 1.5)

  - [x] 7.1 Add `getEmpfangeneFreigaben` mock to dashboard test
    - File: `__tests__/gamification/dashboard-metriken.test.ts`
    - Add a hoisted mock for `getEmpfangeneFreigaben`:
      ```
      const { mockGetEmpfangeneFreigaben } = vi.hoisted(() => ({ mockGetEmpfangeneFreigaben: vi.fn() }));
      vi.mock("@/lib/services/freigabe-service", () => ({ getEmpfangeneFreigaben: mockGetEmpfangeneFreigaben }));
      ```
    - In `setupMocks()`, add `mockGetEmpfangeneFreigaben.mockResolvedValue({ sets: [], songs: [] })`
    - _Bug_Condition: Dashboard route imports getEmpfangeneFreigaben but test doesn't mock freigabe-service_
    - _Expected_Behavior: Test SHALL mock freigabe-service with getEmpfangeneFreigaben returning { sets: [], songs: [] }_
    - _Preservation: Dashboard API continues to return all DashboardData fields_
    - _Requirements: 1.5, 2.5, 3.7_

  - [x] 7.2 Verify Group 5 test passes
    - **Property 1: Expected Behavior** - Dashboard Freigabe Service Mock
    - **IMPORTANT**: Re-run `__tests__/gamification/dashboard-metriken.test.ts` — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms fix works)
    - _Requirements: 2.5_

- [ ] 8. Fix Group 6: Stale `arbThemeColors` Generator (Req 1.6)

  - [x] 8.1 Add 8 missing fields to `arbThemeColors` generator
    - File: `__tests__/theming/serializer-roundtrip.property.test.ts`
    - Add the following fields to the `arbThemeColors` fc.record: `pillTag`, `headlineColor`, `copyColor`, `labelColor`, `linkColor`, `mutedColor`, `buttonTextColor`, `iconColor` — all using `arbHexColor`
    - _Bug_Condition: arbThemeColors generates 17 fields but ThemeColors now has 25 fields_
    - _Expected_Behavior: Generator SHALL include all 25 ThemeColors fields so roundtrip deepEqual passes_
    - _Preservation: serializeTheme/deserializeTheme roundtrip continues to produce deep-equal results_
    - _Requirements: 1.6, 2.6, 3.8_

  - [x] 8.2 Verify Group 6 test passes
    - **Property 1: Expected Behavior** - Serializer Roundtrip with Full ThemeColors
    - **IMPORTANT**: Re-run `__tests__/theming/serializer-roundtrip.property.test.ts` — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms fix works)
    - _Requirements: 2.6_

- [ ] 9. Fix Group 7: Changed Component Patterns in ARIA Test (Req 1.7, 1.8)

  - [x] 9.1 Update RevealLine and StropheCard ARIA checks
    - File: `__tests__/emotional/aria-attributes.property.test.ts`
    - **RevealLine (Req 1.7)**: Replace the `revealLine-aria-hidden` check — instead of checking for `aria-hidden`, verify that the component uses conditional rendering (`&& isRevealed &&` pattern). Update both the ARIA_CHECKS array entry and the standalone unit test.
    - **StropheCard (Req 1.8)**: Update the `stropheCard-reveal-all-aria-label` check and the standalone unit test. The button now uses `role="switch"` with `aria-checked` and an `aria-label` that includes conditional "aufdecken"/"ausblenden" text. Update the regex to match the actual template: `` aria-label={`...${strophe.name}...`} `` with "aufdecken" or "ausblenden".
    - _Bug_Condition: RevealLine uses conditional rendering instead of aria-hidden; StropheCard uses role="switch" with different aria-label template_
    - _Expected_Behavior: Tests SHALL accept conditional rendering for RevealLine and match the actual StropheCard aria-label template_
    - _Preservation: ARIA attributes on ModeTabs, InterpretationTab, NotesTab remain correct_
    - _Requirements: 1.7, 1.8, 2.7, 2.8, 3.9_

  - [x] 9.2 Verify Group 7 test passes
    - **Property 1: Expected Behavior** - ARIA Attributes Updated Checks
    - **IMPORTANT**: Re-run `__tests__/emotional/aria-attributes.property.test.ts` — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms fix works)
    - _Requirements: 2.7, 2.8_

- [ ] 10. Fix Group 8: Missing `aria-label` on Production Components (Req 1.9, 1.10)

  - [x] 10.1 Add `aria-label` attributes to SongDetailPage Link elements
    - File: `src/app/(main)/songs/[id]/page.tsx`
    - Add `aria-label` to each learning-mode Link that lacks one:
      - Lesemodus → `aria-label="Lesemodus öffnen"`
      - Inhalt & Bedeutung → `aria-label="Inhalt und Bedeutung öffnen"`
      - Gesangstechnik-Coach → `aria-label="Gesangstechnik-Coach öffnen"`
      - Quiz → `aria-label="Quiz öffnen"`
      - Lückentext → `aria-label="Lückentext öffnen"`
      - Zeile für Zeile → `aria-label="Zeile für Zeile öffnen"`
      - Rückwärts lernen → `aria-label="Rückwärts lernen öffnen"`
    - Also add `aria-label` to set pill Link elements: `` aria-label={`Set „${s.name}" öffnen`} ``
    - _Bug_Condition: Link elements in SongDetailPage lack aria-label attributes_
    - _Expected_Behavior: All learning mode Links SHALL have aria-label describing their purpose_
    - _Requirements: 1.9, 2.9_

  - [x] 10.2 Add `aria-label` to SetCard expand/collapse button
    - File: `src/components/songs/set-card.tsx`
    - Add `aria-label` to the expand/collapse button:
      ```
      aria-label={expanded ? `Set „${set.name}" einklappen` : `Set „${set.name}" aufklappen`}
      ```
    - _Bug_Condition: SetCard button lacks aria-label attribute_
    - _Expected_Behavior: Button SHALL have aria-label with set name context_
    - _Requirements: 1.10, 2.10_

  - [x] 10.3 Verify Group 8 test passes
    - **Property 1: Expected Behavior** - Song Accessibility aria-labels
    - **IMPORTANT**: Re-run `__tests__/songs/song-accessibility.property.test.ts` — do NOT write a new test
    - **EXPECTED OUTCOME**: Test PASSES (confirms fix works)
    - _Requirements: 2.9, 2.10_

- [ ] 11. Fix Group 9: Stale Grid Classes and Missing `markups` in Stage Mocks (Req 1.11–1.13)

  - [x] 11.1 Update grid responsive test expected classes
    - File: `__tests__/songs/song-card-grid-responsive.property.test.ts`
    - Update `EXPECTED_GRID_CLASSES` to match the actual component:
      ```
      const EXPECTED_GRID_CLASSES = ["grid", "grid-cols-2", "md:grid-cols-3", "lg:grid-cols-4", "gap-4"];
      ```
    - Remove `"grid-cols-1"` and `"sm:grid-cols-2"`
    - _Bug_Condition: Test expects grid-cols-1 sm:grid-cols-2 but component uses grid-cols-2_
    - _Expected_Behavior: Expected classes SHALL match actual component: grid-cols-2 md:grid-cols-3 lg:grid-cols-4_
    - _Preservation: SongCardGrid continues to render one SongCard per song_
    - _Requirements: 1.11, 2.11, 3.10_

  - [x] 11.2 Add `markups` to stage bundle API test generator
    - File: `__tests__/stage/bundle-api.property.test.ts`
    - Add `markups: fc.constant([])` to the `stropheArb` generator
    - _Bug_Condition: Mock strophen lack markups arrays, route accesses strophe.markups[0]?.timecodeMs_
    - _Expected_Behavior: Each strophe in mock SHALL include markups array_
    - _Preservation: Stage bundle API continues to return songs, sets, strophen, zeilen with ETag header_
    - _Requirements: 1.12, 2.12, 3.11_

  - [x] 11.3 Add `markups` to ETag determinism test generator
    - File: `__tests__/stage/etag-determinism.property.test.ts`
    - Add `markups: fc.constant([])` to the `stropheArb` generator
    - _Bug_Condition: Mock strophen lack markups arrays, causing route to return 500_
    - _Expected_Behavior: Each strophe in mock SHALL include markups array_
    - _Preservation: ETag computation remains deterministic_
    - _Requirements: 1.13, 2.13, 3.12_

  - [x] 11.4 Verify Group 9 tests pass
    - **Property 1: Expected Behavior** - Grid Classes and Stage Markups
    - **IMPORTANT**: Re-run all 3 test files — do NOT write new tests
    - **EXPECTED OUTCOME**: All 3 files PASS (confirms fix works)
    - _Requirements: 2.11, 2.12, 2.13_

- [x] 12. Verify preservation tests still pass
  - **Property 2: Preservation** - All Previously-Passing Tests Continue to Pass
  - **IMPORTANT**: Re-run the SAME preservation check from task 2 — do NOT write new tests
  - Run the full test suite after all fixes are applied
  - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - Confirm all previously-passing tests still pass after all fixes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_

- [x] 13. Checkpoint - Ensure all tests pass
  - Run `npx vitest --run` to execute the full test suite
  - Verify 0 failures across all test files
  - Confirm all 41 previously-failing tests now pass
  - Confirm all previously-passing tests continue to pass
  - Ask the user if questions arise
