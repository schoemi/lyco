# Implementation Plan

- [x] 1. Write bug condition exploration test — confirm all 9 affected test files fail for documented reasons
  - **Property 1: Bug Condition** - Stale Test Assertions Across 9 Files
  - **CRITICAL**: Run these tests BEFORE implementing any fixes
  - **GOAL**: Surface counterexamples that demonstrate each bug condition exists
  - **Scoped PBT Approach**: Run each of the 9 affected test files individually and confirm they fail with the specific error documented in the design
  - Run `__tests__/auth/access-control.property.test.ts` — expect 3 failures with `Cannot find module 'next/server'`
  - Run `__tests__/auth/cookie-security.property.test.ts` — expect 2 failures: `secure` is `false` not `true`, `sameSite` is `"lax"` not `"strict"`
  - Run `__tests__/audio/audio-player.test.ts` — expect 9 failures with `useSharedAudio must be used within SharedAudioProvider`
  - Run `__tests__/audio/seek-mp3-only.property.test.ts` — expect 1 failure with `useSharedAudio must be used within SharedAudioProvider`
  - Run `__tests__/audio/timecode-upsert.property.test.ts` — expect 1 failure: `getByPlaceholderText("[mm:ss]")` finds no element
  - Run `__tests__/audio/audio-quellen-manager.test.ts` — expect 1 failure: `Found multiple elements with the text: Instrumental`
  - Run `__tests__/genius/genius-search-api.test.ts` — expect 2 failures: exact error message mismatch and status code mismatch
  - Run `__tests__/smart-analysis/analyse-service.test.ts` — expect 1 failure: function no longer throws on strophen count mismatch
  - Run `__tests__/smart-analysis/llm-client.test.ts` — expect 1 failure: `maxRetries: 2, timeout: 30000` assertion fails
  - **EXPECTED OUTCOME**: All 21 tests FAIL (this confirms the bugs exist)
  - Document counterexamples found for each group
  - Mark task complete when all 9 files are run and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Write preservation baseline — run full suite excluding the 9 affected files (BEFORE implementing fixes)
  - **Property 2: Preservation** - All Currently-Passing Tests Remain Passing
  - **IMPORTANT**: Follow observation-first methodology
  - Run the full test suite excluding the 9 affected test files to establish the passing baseline
  - Record the total number of passing tests and the pass/fail counts
  - Verify all tests outside the 9 affected files pass on UNFIXED code
  - **EXPECTED OUTCOME**: All non-affected tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when baseline is recorded and all non-affected tests pass
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix Group 1 — `access-control.property.test.ts` missing `next-auth` mock

  - [x] 3.1 Add `next-auth` and `@/lib/auth.config` mocks to `access-control.property.test.ts`
    - Add `vi.mock("next-auth", ...)` returning a mock `auth` function (matching the pattern in `auth-middleware.test.ts`)
    - Add `vi.mock("@/lib/auth.config", ...)` to prevent loading the real config which triggers `next/server` resolution
    - Update `beforeEach` to use `vi.doMock` for both `next-auth` and `@/lib/auth.config` after `vi.resetModules()`
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "access-control.property.test.ts" AND missing next-auth mock_
    - _Expected_Behavior: All 3 role-based access control tests pass with proper module mocking_
    - _Preservation: All other auth tests remain unmodified and passing_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Verify `access-control.property.test.ts` passes after fix
    - **Property 1: Expected Behavior** - Access Control Tests Pass
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/auth/access-control.property.test.ts`
    - **EXPECTED OUTCOME**: All 3 tests PASS (confirms bug is fixed)
    - _Requirements: 2.1_

- [x] 4. Fix Group 2 — `cookie-security.property.test.ts` secure/sameSite assertions

  - [x] 4.1 Update `secure` and `sameSite` assertions in `cookie-security.property.test.ts`
    - Change `expect(options.secure).toBe(true)` to `expect(options.secure).toBe(false)` (test env is not production)
    - Change `expect(options.sameSite).toBe("strict")` to `expect(options.sameSite).toBe("lax")` to match `auth.config.ts`
    - Fix "no unsafe overrides" test to accept environment-aware `secure` logic and `sameSite: "lax"`
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "cookie-security.property.test.ts" AND stale secure/sameSite assertions_
    - _Expected_Behavior: Cookie security tests assert environment-aware values_
    - _Preservation: All other auth tests remain unmodified and passing_
    - _Requirements: 1.2, 2.2_

  - [x] 4.2 Verify `cookie-security.property.test.ts` passes after fix
    - **Property 1: Expected Behavior** - Cookie Security Tests Pass
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/auth/cookie-security.property.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms bug is fixed)
    - _Requirements: 2.2_

- [x] 5. Fix Group 3 — `audio-player.test.ts` + `seek-mp3-only.property.test.ts` missing SharedAudioProvider

  - [x] 5.1 Wrap `AudioPlayer` renders in `SharedAudioProvider` in both test files
    - In `audio-player.test.ts`: import `SharedAudioProvider` from `@/components/songs/shared-audio-provider`
    - Create a helper function `renderWithProvider` that wraps `AudioPlayer` in `SharedAudioProvider` with `audioQuellen` prop
    - Update all 9 tests in `audio-player.test.ts` to use the wrapper helper
    - In `seek-mp3-only.property.test.ts`: import `SharedAudioProvider` and wrap the `AudioPlayer` render in the provider
    - _Bug_Condition: isBugCondition(testFile) where testFile.path IN ["audio-player.test.ts", "seek-mp3-only.property.test.ts"] AND missing SharedAudioProvider wrapper_
    - _Expected_Behavior: AudioPlayer renders successfully within SharedAudioProvider context_
    - _Preservation: All other audio tests remain unmodified and passing_
    - _Requirements: 1.3, 1.4, 2.3, 2.4_

  - [x] 5.2 Verify `audio-player.test.ts` and `seek-mp3-only.property.test.ts` pass after fix
    - **Property 1: Expected Behavior** - AudioPlayer Tests Pass With Provider
    - **IMPORTANT**: Re-run the SAME test files from task 1 — do NOT write new tests
    - Run `npx vitest run __tests__/audio/audio-player.test.ts __tests__/audio/seek-mp3-only.property.test.ts`
    - **EXPECTED OUTCOME**: All 10 tests PASS (confirms bug is fixed)
    - _Requirements: 2.3, 2.4_

- [x] 6. Fix Group 4 — `timecode-upsert.property.test.ts` placeholder text mismatch

  - [x] 6.1 Update placeholder query in `timecode-upsert.property.test.ts`
    - Change `screen.getByPlaceholderText("[mm:ss]")` to `screen.getByPlaceholderText("mm:ss")` (remove brackets)
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "timecode-upsert.property.test.ts" AND stale placeholder text "[mm:ss]"_
    - _Expected_Behavior: Placeholder query matches current component text "mm:ss"_
    - _Preservation: All other audio tests remain unmodified and passing_
    - _Requirements: 1.5, 2.5_

  - [x] 6.2 Verify `timecode-upsert.property.test.ts` passes after fix
    - **Property 1: Expected Behavior** - Timecode Upsert Test Passes
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/audio/timecode-upsert.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.5_

- [x] 7. Fix Group 5 — `audio-quellen-manager.test.ts` duplicate text query

  - [x] 7.1 Fix duplicate `"Instrumental"` text query in `audio-quellen-manager.test.ts`
    - In the "renders existing audio sources in a list" test, change `screen.getByText("Instrumental")` to a more specific query
    - Use `screen.getAllByText("Instrumental")` and filter by element type, or scope with `within()` to the list area
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "audio-quellen-manager.test.ts" AND getByText("Instrumental") matches both list label and RollenAuswahl option_
    - _Expected_Behavior: Query uniquely targets the list item label, not the dropdown option_
    - _Preservation: All other audio-quellen-manager tests (form rendering, empty state, edit/delete, inline edit, validation, fetch callbacks) remain unmodified and passing_
    - _Requirements: 1.6, 2.6, 3.5_

  - [x] 7.2 Verify `audio-quellen-manager.test.ts` passes after fix
    - **Property 1: Expected Behavior** - Audio Quellen Manager Test Passes
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/audio/audio-quellen-manager.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS including the previously-failing one (confirms bug is fixed)
    - _Requirements: 2.6, 3.5_

- [x] 8. Fix Group 6 — `genius-search-api.test.ts` error message and empty query assertions

  - [x] 8.1 Update error message and empty query assertions in `genius-search-api.test.ts`
    - Fix 502 error test: change `expect(json.error).toBe("Genius-Suche fehlgeschlagen")` to `expect(json.error).toContain("Genius-Suche fehlgeschlagen")`
    - Fix empty query test: change expected status from 200 to 400, assert error message is `"Suchbegriff darf nicht leer sein"`, remove assertion that `mockSearchSongs` was called
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "genius-search-api.test.ts" AND stale error message exact match AND stale empty query status 200_
    - _Expected_Behavior: Error test uses toContain for prefix match; empty query test expects 400 with validation message_
    - _Preservation: The 4 passing tests (401 auth, 400 missing key, 200 success, auth error) remain unmodified and passing_
    - _Requirements: 1.7, 1.8, 2.7, 2.8, 3.2_

  - [x] 8.2 Verify `genius-search-api.test.ts` passes after fix
    - **Property 1: Expected Behavior** - Genius Search API Tests Pass
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/genius/genius-search-api.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS including the 2 previously-failing ones (confirms bug is fixed)
    - _Requirements: 2.7, 2.8, 3.2_

- [x] 9. Fix Group 7 — `analyse-service.test.ts` strophen count mismatch test

  - [x] 9.1 Update strophen count mismatch test in `analyse-service.test.ts`
    - Change `expect(() => validateAnalyseResponse(raw, 3)).toThrow(...)` to assert the function does NOT throw
    - Assert the function returns a valid result
    - Use `vi.spyOn(console, "warn")` to verify a warning is logged with the expected mismatch text
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "analyse-service.test.ts" AND expects throw on strophen count mismatch_
    - _Expected_Behavior: validateAnalyseResponse tolerates mismatch, logs console.warn, returns valid result_
    - _Preservation: All other analyse-service tests (buildAnalysePrompt, other validateAnalyseResponse, getAnalysis) remain unmodified and passing_
    - _Requirements: 1.9, 2.9, 3.3_

  - [x] 9.2 Verify `analyse-service.test.ts` passes after fix
    - **Property 1: Expected Behavior** - Analyse Service Tests Pass
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/smart-analysis/analyse-service.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS including the previously-failing one (confirms bug is fixed)
    - _Requirements: 2.9, 3.3_

- [x] 10. Fix Group 8 — `llm-client.test.ts` config value assertions

  - [x] 10.1 Update config value assertions in `llm-client.test.ts`
    - Change `maxRetries: 2` to `maxRetries: 4`
    - Change `timeout: 30000` to `timeout: 60000`
    - _Bug_Condition: isBugCondition(testFile) where testFile.path = "llm-client.test.ts" AND stale maxRetries/timeout values_
    - _Expected_Behavior: Config assertions match current production defaults (maxRetries: 4, timeout: 60000)_
    - _Preservation: All other llm-client tests (missing API key, config overrides, chat, responseFormat) remain unmodified and passing_
    - _Requirements: 1.10, 2.10, 3.4_

  - [x] 10.2 Verify `llm-client.test.ts` passes after fix
    - **Property 1: Expected Behavior** - LLM Client Tests Pass
    - **IMPORTANT**: Re-run the SAME test file from task 1 — do NOT write a new test
    - Run `npx vitest run __tests__/smart-analysis/llm-client.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS including the previously-failing one (confirms bug is fixed)
    - _Requirements: 2.10, 3.4_

- [x] 11. Verify preservation — re-run full suite excluding 9 affected files after all fixes
  - **Property 2: Preservation** - No Regressions After All Fixes
  - **IMPORTANT**: Re-run the SAME preservation check from task 2 — do NOT write new tests
  - Run the full test suite excluding the 9 affected test files
  - Compare pass/fail counts against the baseline recorded in task 2
  - **EXPECTED OUTCOME**: All non-affected tests still PASS with identical counts (confirms no regressions)
  - Confirm zero production source files were modified (`git diff --name-only src/`)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 12. Checkpoint — run full test suite and verify 0 failures
  - Run `npx vitest run` to execute the entire test suite
  - Verify all 21 previously-failing tests now pass
  - Verify total test count remains the same (no tests removed or duplicated)
  - Verify 0 test failures across the entire suite
  - Verify zero production source files were modified
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 1.1–1.10, 2.1–2.10, 3.1–3.6_
