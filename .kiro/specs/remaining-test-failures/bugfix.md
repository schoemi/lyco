# Bugfix Requirements Document

## Introduction

After fixing 41 stale tests in the `stale-test-fixes` spec, 21 pre-existing test failures remain across 9 test files. These are all test-layer issues — the production code is correct, but the tests have drifted from the actual implementation. The fixes update the tests to match current behavior without changing any production code.

The failures fall into 8 distinct groups: missing `next/server` module resolution, cookie secure flag environment mismatch, missing `SharedAudioProvider` context wrapper, placeholder text mismatch, duplicate text query ambiguity, Genius API behavior changes, strophen count tolerance change, and LLM client config value drift.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the test file `__tests__/auth/access-control.property.test.ts` is executed THEN all 3 tests fail with `Cannot find module 'next/server'` because the test directly imports `NextResponse` from `next/server` which is not resolved in the Vitest test environment

1.2 WHEN the test file `__tests__/auth/cookie-security.property.test.ts` is executed THEN 2 tests fail because they assert `secure: true` on the session cookie, but the production code sets `secure` to `true` only when `NODE_ENV === "production"`, which is `false` in the test environment

1.3 WHEN the test file `__tests__/audio/audio-player.test.ts` is executed THEN all 9 tests fail with `useSharedAudio must be used within SharedAudioProvider` because the `AudioPlayer` component now uses the `useSharedAudio` hook but the tests render `AudioPlayer` without wrapping it in `SharedAudioProvider`

1.4 WHEN the test file `__tests__/audio/seek-mp3-only.property.test.ts` is executed THEN the test fails with `useSharedAudio must be used within SharedAudioProvider` for the same missing context provider reason as 1.3

1.5 WHEN the test file `__tests__/audio/timecode-upsert.property.test.ts` is executed THEN the test "first save POSTs, second save PUTs" fails because it queries `screen.getByPlaceholderText("[mm:ss]")` but the component's placeholder was changed from `[mm:ss]` to `mm:ss` (without brackets)

1.6 WHEN the test file `__tests__/audio/audio-quellen-manager.test.ts` is executed THEN the test "renders existing audio sources in a list" fails with `Found multiple elements with the text: Instrumental` because `getByText("Instrumental")` matches both the dropdown option and the list item

1.7 WHEN the test file `__tests__/genius/genius-search-api.test.ts` is executed THEN the test "gibt 502 zurück wenn Genius-API fehlschlägt" fails because it expects the error message to be exactly `"Genius-Suche fehlgeschlagen"` but the API now returns `"Genius-Suche fehlgeschlagen: Genius API down"` (error details appended)

1.8 WHEN the test file `__tests__/genius/genius-search-api.test.ts` is executed THEN the test "gibt 200 zurück bei leerer Query" fails because it expects status 200 for an empty/missing query, but the API now validates empty queries and returns status 400 with `"Suchbegriff darf nicht leer sein"`

1.9 WHEN the test file `__tests__/smart-analysis/analyse-service.test.ts` is executed THEN the test "throws when strophenAnalysen count does not match" fails because `validateAnalyseResponse` no longer throws on strophen count mismatch — it now logs a `console.warn` and tolerates the mismatch

1.10 WHEN the test file `__tests__/smart-analysis/llm-client.test.ts` is executed THEN the test "creates client with env vars" fails because it expects `maxRetries: 2, timeout: 30000` but the production code now uses `maxRetries: 4, timeout: 60000`

### Expected Behavior (Correct)

2.1 WHEN the test file `__tests__/auth/access-control.property.test.ts` is executed THEN all 3 role-based access control tests SHALL pass by properly mocking or resolving the `next/server` module in the test environment

2.2 WHEN the test file `__tests__/auth/cookie-security.property.test.ts` is executed THEN the 2 cookie security tests SHALL pass by asserting the cookie `secure` flag matches the environment-aware logic (`true` only in production) and verifying `sameSite` matches the actual value `"lax"` instead of `"strict"`

2.3 WHEN the test file `__tests__/audio/audio-player.test.ts` is executed THEN all 9 AudioPlayer tests SHALL pass by wrapping the rendered `AudioPlayer` component in a `SharedAudioProvider` with the appropriate `audioQuellen` prop

2.4 WHEN the test file `__tests__/audio/seek-mp3-only.property.test.ts` is executed THEN the seek property test SHALL pass by wrapping the rendered `AudioPlayer` component in a `SharedAudioProvider` with the appropriate `audioQuellen` prop

2.5 WHEN the test file `__tests__/audio/timecode-upsert.property.test.ts` is executed THEN the test SHALL pass by querying `screen.getByPlaceholderText("mm:ss")` (without brackets) to match the current component placeholder

2.6 WHEN the test file `__tests__/audio/audio-quellen-manager.test.ts` is executed THEN the test SHALL pass by using a more specific query (e.g., `getAllByText` and filtering, or scoping the query to the list area) to avoid matching duplicate "Instrumental" text

2.7 WHEN the test file `__tests__/genius/genius-search-api.test.ts` is executed THEN the 502 error test SHALL pass by asserting that the error message contains `"Genius-Suche fehlgeschlagen"` (using `toContain` or a prefix check) rather than expecting an exact match

2.8 WHEN the test file `__tests__/genius/genius-search-api.test.ts` is executed THEN the empty query test SHALL pass by expecting status 400 and the error message `"Suchbegriff darf nicht leer sein"` to match the current API validation behavior

2.9 WHEN the test file `__tests__/smart-analysis/analyse-service.test.ts` is executed THEN the strophen count mismatch test SHALL pass by asserting that `validateAnalyseResponse` does NOT throw but instead logs a warning via `console.warn` and returns a valid result

2.10 WHEN the test file `__tests__/smart-analysis/llm-client.test.ts` is executed THEN the test SHALL pass by expecting `maxRetries: 4, timeout: 60000` to match the current production configuration values

### Unchanged Behavior (Regression Prevention)

3.1 WHEN any test file NOT listed in this bugfix is executed THEN the system SHALL CONTINUE TO produce the same pass/fail result as before

3.2 WHEN the 4 passing tests in `__tests__/genius/genius-search-api.test.ts` (401 auth, 400 missing key, 200 success, and the other passing tests) are executed THEN the system SHALL CONTINUE TO pass without modification

3.3 WHEN the passing tests in `__tests__/smart-analysis/analyse-service.test.ts` (buildAnalysePrompt tests, other validateAnalyseResponse tests, getAnalysis tests) are executed THEN the system SHALL CONTINUE TO pass without modification

3.4 WHEN the passing tests in `__tests__/smart-analysis/llm-client.test.ts` (missing API key, config overrides, chat tests, responseFormat tests) are executed THEN the system SHALL CONTINUE TO pass without modification

3.5 WHEN the passing tests in `__tests__/audio/audio-quellen-manager.test.ts` (form rendering, empty state, edit/delete buttons, inline edit, validation, fetch callbacks) are executed THEN the system SHALL CONTINUE TO pass without modification

3.6 WHEN any production source code file is examined THEN the system SHALL CONTINUE TO have zero changes — all fixes are test-layer only
