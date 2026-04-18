# Remaining Test Failures Bugfix Design

## Overview

21 pre-existing test failures remain across 9 test files after the `stale-test-fixes` spec resolved 41 other failures. All failures are test-layer drift — the production code is correct, but the tests assert stale behavior. The fix updates each test to match the current production implementation without changing any production source code.

The failures cluster into 8 root cause groups: missing `next-auth` mock causing `next/server` resolution failure, cookie `secure` flag environment mismatch, missing `SharedAudioProvider` context wrapper, placeholder text mismatch, duplicate text query ambiguity, Genius API behavior changes, strophen count tolerance change, and LLM client config value drift.

## Glossary

- **Bug_Condition (C)**: A test assertion or setup that has drifted from the current production behavior, causing the test to fail
- **Property (P)**: The test passes and correctly validates the current production behavior
- **Preservation**: All currently-passing tests continue to pass with no modifications
- **SharedAudioProvider**: React context provider in `src/components/songs/shared-audio-provider.tsx` that supplies shared audio state to `AudioPlayer` via the `useSharedAudio` hook
- **next/server resolution**: ESM module resolution of `next/server` fails when `next-auth/lib/env.js` is loaded without mocking `next-auth` first
- **Cookie secure flag**: The `secure` attribute on the session cookie, set to `true` only when `NODE_ENV === "production"` per `src/lib/auth.config.ts`
- **RollenAuswahl**: Component rendering a `<select>` with role options including "Instrumental", causing duplicate text matches in the DOM

## Bug Details

### Bug Condition

The bug manifests when any of the 9 affected test files are executed. Each test file contains one or more assertions that no longer match the current production behavior, causing test failures despite the production code being correct.

**Formal Specification:**
```
FUNCTION isBugCondition(testFile)
  INPUT: testFile of type TestFile
  OUTPUT: boolean

  RETURN testFile.path IN [
    "__tests__/auth/access-control.property.test.ts",
    "__tests__/auth/cookie-security.property.test.ts",
    "__tests__/audio/audio-player.test.ts",
    "__tests__/audio/seek-mp3-only.property.test.ts",
    "__tests__/audio/timecode-upsert.property.test.ts",
    "__tests__/audio/audio-quellen-manager.test.ts",
    "__tests__/genius/genius-search-api.test.ts",
    "__tests__/smart-analysis/analyse-service.test.ts",
    "__tests__/smart-analysis/llm-client.test.ts"
  ]
  AND testFile.containsStaleAssertions() = true
END FUNCTION
```

### Examples

- **Group 1**: `access-control.property.test.ts` — imports middleware which triggers `next-auth/lib/env.js` loading `next/server` without ESM `.js` extension → `Cannot find module 'next/server'`. The working `auth-middleware.test.ts` avoids this by mocking `next-auth` before importing the middleware.
- **Group 2**: `cookie-security.property.test.ts` — asserts `secure: true` and `sameSite: "strict"`, but production sets `secure: process.env.NODE_ENV === "production"` (false in test) and `sameSite: "lax"`.
- **Group 3**: `audio-player.test.ts` and `seek-mp3-only.property.test.ts` — render `AudioPlayer` without `SharedAudioProvider`, but `AudioPlayer` now calls `useSharedAudio()` which throws without the provider.
- **Group 4**: `timecode-upsert.property.test.ts` — queries `screen.getByPlaceholderText("[mm:ss]")` but the component placeholder is now `"mm:ss"` (no brackets).
- **Group 5**: `audio-quellen-manager.test.ts` — `getByText("Instrumental")` matches both the list item label and the `RollenAuswahl` dropdown option "Instrumental".
- **Group 6**: `genius-search-api.test.ts` — expects exact error `"Genius-Suche fehlgeschlagen"` but production now returns `"Genius-Suche fehlgeschlagen: ${message}"`. Also expects status 200 for empty query but production now validates and returns 400.
- **Group 7**: `analyse-service.test.ts` — expects `validateAnalyseResponse` to throw on strophen count mismatch, but production now logs `console.warn` and tolerates the mismatch.
- **Group 8**: `llm-client.test.ts` — expects `maxRetries: 2, timeout: 30000` but production defaults are now `maxRetries: 4, timeout: 60000`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All currently-passing tests across the entire test suite continue to pass
- The 4 passing tests in `genius-search-api.test.ts` (401 auth, 400 missing key, 200 success, and auth-related error handling) remain unmodified
- All passing tests in `analyse-service.test.ts` (buildAnalysePrompt tests, other validateAnalyseResponse tests, getAnalysis tests) remain unmodified
- All passing tests in `llm-client.test.ts` (missing API key, config overrides, chat tests, responseFormat tests) remain unmodified
- All passing tests in `audio-quellen-manager.test.ts` (form rendering, empty state, edit/delete buttons, inline edit, validation, fetch callbacks) remain unmodified
- Zero production source code files are modified

**Scope:**
All test files NOT listed in this bugfix should be completely unaffected. This includes:
- All tests in `__tests__/cloze/`, `__tests__/admin/`, `__tests__/gamification/`, etc.
- All other passing tests within the 9 affected files
- All production code in `src/`

## Hypothesized Root Cause

Based on analysis of the test files and production code, the root causes are confirmed (not hypothesized — each was verified by reading both the test and production code):

1. **Group 1 — Missing `next-auth` mock**: The `access-control.property.test.ts` mocks `@/lib/auth` but not `next-auth` itself. When the middleware is imported, it executes `import NextAuth from "next-auth"` which loads `next-auth/lib/env.js`, which tries to import `next/server` without the `.js` extension. ESM resolution fails. The working `auth-middleware.test.ts` mocks `next-auth` and `@/lib/auth.config` before importing the middleware, preventing the real `next-auth` from loading.

2. **Group 2 — Environment-aware cookie config**: The `cookie-security.property.test.ts` asserts `secure: true` and `sameSite: "strict"`. But `src/lib/auth.config.ts` sets `secure: process.env.AUTH_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production"` (evaluates to `false` in test env) and `sameSite: "lax"`. The test was written assuming production-like values.

3. **Group 3 — SharedAudioProvider refactor**: `AudioPlayer` was refactored to use `useSharedAudio()` from `SharedAudioProvider`. The 9 tests in `audio-player.test.ts` and 1 test in `seek-mp3-only.property.test.ts` render `AudioPlayer` directly without wrapping in `SharedAudioProvider`, causing `useSharedAudio must be used within SharedAudioProvider`.

4. **Group 4 — Placeholder text change**: `timecode-eingabe.tsx` changed its placeholder from `"[mm:ss]"` to `"mm:ss"` (brackets removed). The test queries `screen.getByPlaceholderText("[mm:ss]")` which no longer matches.

5. **Group 5 — Duplicate text from RollenAuswahl**: The `audio-quellen-manager.test.ts` creates a quelle with `label: "Instrumental"`. The `AudioQuellenManager` component now renders a `RollenAuswahl` dropdown for each quelle, which includes an `<option>` with text "Instrumental". `getByText("Instrumental")` matches both the list label and the dropdown option.

6. **Group 6 — Genius API route changes**: The route `src/app/api/songs/genius/search/route.ts` now (a) appends the error message to the 502 response: `"Genius-Suche fehlgeschlagen: ${message}"` instead of just `"Genius-Suche fehlgeschlagen"`, and (b) validates empty queries returning 400 with `"Suchbegriff darf nicht leer sein"` instead of passing them through as 200.

7. **Group 7 — Strophen count tolerance**: `validateAnalyseResponse` in `src/lib/services/analyse-service.ts` no longer throws when `strophenAnalysen.length !== strophenCount`. It now logs a `console.warn` and returns the result, tolerating the mismatch.

8. **Group 8 — LLM client config drift**: `src/lib/services/llm-client.ts` default values changed from `maxRetries: 2, timeout: 30000` to `maxRetries: 4, timeout: 60000`. The test still asserts the old values.

## Correctness Properties

Property 1: Bug Condition — Stale test assertions are updated to match production

_For any_ test file where the bug condition holds (the test contains stale assertions against current production behavior), the fixed test SHALL pass by asserting the correct current behavior: proper mocks for module resolution, environment-aware cookie values, required context providers, current placeholder text, unambiguous DOM queries, current API response formats, current validation behavior, and current config defaults.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation — All currently-passing tests remain unchanged

_For any_ test that currently passes (not in the bug condition set), the fixed test suite SHALL produce the same pass result, preserving all existing test coverage and assertions without modification.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

All fixes are test-layer only. Zero production files are modified.

**File**: `__tests__/auth/access-control.property.test.ts`

**Changes**:
1. **Add `next-auth` mock**: Add `vi.mock("next-auth", ...)` that returns a mock `auth` function (matching the pattern in `auth-middleware.test.ts`) before the middleware import
2. **Add `@/lib/auth.config` mock**: Add `vi.mock("@/lib/auth.config", ...)` to prevent loading the real config which triggers `next/server` resolution
3. **Update `beforeEach`**: Use `vi.doMock` for both `next-auth` and `@/lib/auth.config` after `vi.resetModules()`, matching the working middleware test pattern
4. **Remove direct `NextResponse` import**: The test imports `NextResponse` from `next/server` at the top level. Since the middleware returns `NextResponse` objects, cast the result type instead of importing `NextResponse` directly, or keep the import since it will resolve once `next-auth` is properly mocked

---

**File**: `__tests__/auth/cookie-security.property.test.ts`

**Changes**:
1. **Fix `secure` assertion**: Change `expect(options.secure).toBe(true)` to `expect(options.secure).toBe(false)` (or assert it equals `process.env.NODE_ENV === "production"`) since the test runs in a non-production environment
2. **Fix `sameSite` assertion**: Change `expect(options.sameSite).toBe("strict")` to `expect(options.sameSite).toBe("lax")` to match the actual config in `auth.config.ts`
3. **Fix "no unsafe overrides" test**: Change `expect(options!.secure).not.toBe(false)` to validate the environment-aware logic instead, and change `expect(options!.sameSite).not.toBe("lax")` to accept `"lax"` as a valid secure value

---

**File**: `__tests__/audio/audio-player.test.ts`

**Changes**:
1. **Import `SharedAudioProvider`**: Add `import { SharedAudioProvider } from "@/components/songs/shared-audio-provider"` 
2. **Wrap all renders**: Every `render(React.createElement(AudioPlayer, ...))` call must be wrapped in `SharedAudioProvider` with the `audioQuellen` prop. Create a helper function like:
   ```typescript
   function renderWithProvider(props: { audioQuellen: AudioQuelleResponse[], ref?: React.Ref<AudioPlayerHandle> }) {
     return render(
       React.createElement(SharedAudioProvider, { audioQuellen: props.audioQuellen },
         React.createElement(AudioPlayer, props)
       )
     );
   }
   ```
3. **Update all 9 tests** to use the wrapper helper

---

**File**: `__tests__/audio/seek-mp3-only.property.test.ts`

**Changes**:
1. **Import `SharedAudioProvider`**: Add the import
2. **Wrap render in provider**: Wrap the `AudioPlayer` render inside `SharedAudioProvider` with the `audioQuellen` prop containing the test quelle

---

**File**: `__tests__/audio/timecode-upsert.property.test.ts`

**Changes**:
1. **Update placeholder query**: Change `screen.getByPlaceholderText("[mm:ss]")` to `screen.getByPlaceholderText("mm:ss")` (remove brackets)

---

**File**: `__tests__/audio/audio-quellen-manager.test.ts`

**Changes**:
1. **Fix duplicate text query**: In the "renders existing audio sources in a list" test, change `screen.getByText("Instrumental")` to a more specific query that targets only the list item label, not the `RollenAuswahl` dropdown option. Options include:
   - Use `screen.getAllByText("Instrumental")` and assert the count or filter by element type
   - Scope the query to the list item's label `<span>` element
   - Use `within()` to scope to the list area

---

**File**: `__tests__/genius/genius-search-api.test.ts`

**Changes**:
1. **Fix 502 error message assertion**: Change `expect(json.error).toBe("Genius-Suche fehlgeschlagen")` to `expect(json.error).toContain("Genius-Suche fehlgeschlagen")` since the production code now appends the error details
2. **Fix empty query test**: Change the expected status from 200 to 400, and assert the error message is `"Suchbegriff darf nicht leer sein"`. Remove the assertion that `mockSearchSongs` was called with `("", "key")` since the route now returns early before calling `searchSongs`

---

**File**: `__tests__/smart-analysis/analyse-service.test.ts`

**Changes**:
1. **Fix strophen count mismatch test**: Change from `expect(() => validateAnalyseResponse(raw, 3)).toThrow(...)` to assert that the function does NOT throw, returns a valid result, and logs a `console.warn`. Use `vi.spyOn(console, "warn")` to verify the warning message contains the expected mismatch text

---

**File**: `__tests__/smart-analysis/llm-client.test.ts`

**Changes**:
1. **Update config assertions**: Change `timeout: 30000` to `timeout: 60000` and `maxRetries: 2` to `maxRetries: 4` to match the current production defaults in `src/lib/services/llm-client.ts`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm each test currently fails for the documented reason (exploratory), then apply the fix and verify all 21 tests pass while all other tests remain unaffected.

### Exploratory Bug Condition Checking

**Goal**: Confirm that each of the 21 failing tests fails for the documented reason BEFORE applying fixes.

**Test Plan**: Run each of the 9 test files individually and verify the error messages match the documented root causes.

**Test Cases**:
1. **access-control**: Run and confirm `Cannot find module 'next/server'` error from `next-auth/lib/env.js` (3 failures)
2. **cookie-security**: Run and confirm `secure` is `false` and `sameSite` is `"lax"` assertions fail (2 failures)
3. **audio-player**: Run and confirm `useSharedAudio must be used within SharedAudioProvider` error (9 failures)
4. **seek-mp3-only**: Run and confirm same `SharedAudioProvider` error (1 failure)
5. **timecode-upsert**: Run and confirm `getByPlaceholderText("[mm:ss]")` finds no element (1 failure)
6. **audio-quellen-manager**: Run and confirm `Found multiple elements with the text: Instrumental` (1 failure)
7. **genius-search-api**: Run and confirm exact error message mismatch and status code mismatch (2 failures)
8. **analyse-service**: Run and confirm the function no longer throws (1 failure)
9. **llm-client**: Run and confirm `maxRetries: 2, timeout: 30000` assertion fails (1 failure)

**Expected Counterexamples**:
- Each test fails with the specific error documented in the root cause analysis
- No test fails for an unexpected reason

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed tests pass and correctly validate current production behavior.

**Pseudocode:**
```
FOR ALL testFile WHERE isBugCondition(testFile) DO
  result := runTests(testFile_fixed)
  ASSERT result.allPassed = true
  ASSERT result.failureCount = 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all tests where the bug condition does NOT hold, the test results are identical before and after the fix.

**Pseudocode:**
```
FOR ALL testFile WHERE NOT isBugCondition(testFile) DO
  ASSERT runTests(testFile_before) = runTests(testFile_after)
END FOR
```

**Testing Approach**: Run the full test suite before and after applying fixes. Compare pass/fail counts to ensure no regressions.

**Test Cases**:
1. **genius-search-api passing tests**: Verify the 4 passing tests (401 auth, 400 missing key, 200 success, auth error) still pass after fixing the 2 failing tests
2. **analyse-service passing tests**: Verify all buildAnalysePrompt, other validateAnalyseResponse, and getAnalysis tests still pass
3. **llm-client passing tests**: Verify missing API key, config overrides, chat, and responseFormat tests still pass
4. **audio-quellen-manager passing tests**: Verify form rendering, empty state, edit/delete, inline edit, validation, and fetch callback tests still pass
5. **Full suite regression**: Run the entire test suite and confirm total pass count is increased by exactly 21

### Unit Tests

- Run each of the 9 affected test files individually after fixes to confirm all 21 previously-failing tests now pass
- Run each affected file's passing tests to confirm no regressions within the file
- Verify the access-control test correctly validates 401, 403, and allowed access for admin routes

### Property-Based Tests

- The access-control test uses `fast-check` to generate random admin route paths — verify it passes for all generated paths
- The cookie-security test uses `fast-check` to generate random session scenarios — verify cookie config holds for all scenarios
- The seek-mp3-only test uses `fast-check` to generate random non-MP3 types and seek targets — verify seekTo returns false for all
- The timecode-upsert test uses `fast-check` to generate random strophe IDs and timecodes — verify upsert behavior for all

### Integration Tests

- Run the full test suite (`npx vitest run`) to confirm all 21 failures are resolved
- Verify the total test count remains the same (no tests were accidentally removed or duplicated)
- Verify zero production source files were modified (check git diff)
