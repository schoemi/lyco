# Bugfix Requirements Document

## Introduction

41 tests across 16 test files are failing because their mocks and assertions have not been updated to match recent code changes. These are not production bugs — the application code is correct, but the tests are stale. The failures fall into 9 distinct groups, each caused by a specific drift between test expectations and actual implementation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `validateAnalyseResponse` receives a JSON response where the strophen count does not match the expected count THEN the test in `response-validation.property.test.ts` expects a thrown error matching `/Erwartete \d+ Strophen-Analysen, aber \d+ erhalten/`, but the implementation only logs a `console.warn` and tolerates the mismatch, causing the test to fail

1.2 WHEN `analyzeSong()` is called in any of the 5 smart-analysis test files (`access-control`, `concurrency-guard`, `error-logging`, `analysis-overwrite`, `analysis-roundtrip`) THEN the function calls `prisma.user.findUnique` to load the user's `sprache`, but the test mocks do not define `prisma.user`, causing `Cannot read properties of undefined (reading 'findUnique')` and all 5 tests fail

1.3 WHEN `addSongToSet()` is called in `set-delete-preserves-songs.property.test.ts` or `set-song-association.property.test.ts` THEN the function calls `prisma.setSong.aggregate()` to determine the next `orderIndex`, but the test mocks only define `create` and `deleteMany` on `setSong` — `aggregate` is missing, causing the tests to fail

1.4 WHEN `getSongDetail()` is called during `song-cascade-delete.property.test.ts` THEN the function expects nested `strophen.zeilen` with `.markups`, `.fortschritte`, and `.notizen` arrays, but the mock's `findUnique` returns strophen with zeilen that lack `markups` arrays, causing `.map()` on undefined and test failure

1.5 WHEN the dashboard API route is called in `dashboard-metriken.test.ts` THEN the route imports and calls `getEmpfangeneFreigaben(userId)` from `@/lib/services/freigabe-service`, but the test does not mock this service, causing the API to return 500 and all 6 dashboard tests fail

1.6 WHEN the serializer roundtrip test in `serializer-roundtrip.property.test.ts` generates a `ThemeColors` object THEN the `arbThemeColors` generator only produces the original 17 fields, but `ThemeColors` now has 24 fields (7 new: `pillTag`, `headlineColor`, `copyColor`, `labelColor`, `linkColor`, `mutedColor`, `buttonTextColor`, `iconColor`), so `deserializeTheme()` fills missing fields with defaults, breaking the `deepEqual` assertion

1.7 WHEN the ARIA attributes test in `aria-attributes.property.test.ts` checks `RevealLine` for `aria-hidden` THEN the test expects `aria-hidden` on translation content, but `RevealLine` now uses conditional rendering (the element is not rendered at all when hidden) instead of `aria-hidden`, causing the check to fail

1.8 WHEN the ARIA attributes test checks `StropheCard`'s button aria-label THEN the test regex `/aria-label\s*=\s*\{?\s*`[^`]*\$\{strophe\.name\}[^`]*`/` expects a specific template literal format, but `StropheCard` now uses `role="switch"` with `aria-checked` and a different `aria-label` template that includes conditional text ("aufdecken"/"ausblenden"), and the regex does not match the actual format

1.9 WHEN the song accessibility test in `song-accessibility.property.test.ts` scans `SongDetailPage` for interactive elements THEN multiple `<Link>` elements (Lesemodus, Inhalt & Bedeutung, Gesangstechnik-Coach, Quiz, Lückentext, Zeile für Zeile, Rückwärts lernen) lack `aria-label` attributes, causing the property test to fail

1.10 WHEN the song accessibility test scans `SetCard` for buttons THEN the expand/collapse `<button>` element lacks an explicit `aria-label` attribute, causing the test to fail

1.11 WHEN the grid responsive test in `song-card-grid-responsive.property.test.ts` checks for Tailwind classes THEN the test expects `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, but the component uses `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (no `grid-cols-1` or `sm:grid-cols-2`), causing the class assertion to fail

1.12 WHEN the stage bundle API test in `bundle-api.property.test.ts` calls the bundle route THEN the mock song data includes `strophen` with `zeilen` arrays but the route also accesses `strophe.markups[0]?.timecodeMs`, and the mock data does not include `markups` on strophen, causing the route to return 500

1.13 WHEN the ETag determinism test in `etag-determinism.property.test.ts` calls the bundle route THEN the same missing `markups` on strophen in mock data causes the route to return 500, failing the ETag header presence assertion

### Expected Behavior (Correct)

2.1 WHEN `validateAnalyseResponse` receives a JSON response where the strophen count does not match THEN the test SHALL expect the tolerant behavior (no throw, only `console.warn`) matching the current implementation

2.2 WHEN `analyzeSong()` is called in any smart-analysis test THEN the test mocks SHALL include `prisma.user` with a `findUnique` method returning `{ sprache: "Deutsch" }`, so the function can load the user's language preference without error

2.3 WHEN `addSongToSet()` is called in set-related tests THEN the test mocks SHALL include `aggregate` on `prisma.setSong` returning `{ _max: { orderIndex: null } }`, so the function can determine the next order index

2.4 WHEN `getSongDetail()` is called during cascade delete tests THEN the mock's `findUnique` SHALL return strophen with zeilen that include `markups: []`, `fortschritte: []`, and `notizen: []` arrays, matching the Prisma include structure

2.5 WHEN the dashboard API route is called in dashboard tests THEN the test SHALL mock `@/lib/services/freigabe-service` with `getEmpfangeneFreigaben` returning `{ sets: [], songs: [] }`, preventing the 500 error

2.6 WHEN the serializer roundtrip test generates a `ThemeColors` object THEN the `arbThemeColors` generator SHALL include all 24 fields (adding `pillTag`, `headlineColor`, `copyColor`, `labelColor`, `linkColor`, `mutedColor`, `buttonTextColor`, `iconColor`), so the roundtrip `deepEqual` assertion passes

2.7 WHEN the ARIA attributes test checks `RevealLine` THEN the test SHALL accept conditional rendering as a valid accessibility pattern (removing the `aria-hidden` check), since not rendering hidden content is equivalent to or better than `aria-hidden`

2.8 WHEN the ARIA attributes test checks `StropheCard`'s button THEN the test SHALL use an updated regex or validation that matches the actual `aria-label` template literal format used by the component (which includes conditional "aufdecken"/"ausblenden" text with `strophe.name`)

2.9 WHEN the song accessibility test scans `SongDetailPage` for interactive elements THEN all learning mode `<Link>` elements SHALL have `aria-label` attributes describing their purpose (e.g., `aria-label="Lesemodus öffnen"`)

2.10 WHEN the song accessibility test scans `SetCard` for buttons THEN the expand/collapse button SHALL have an `aria-label` attribute (e.g., using the set name for context)

2.11 WHEN the grid responsive test checks for Tailwind classes THEN the expected classes SHALL match the actual component: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (without `grid-cols-1` and `sm:grid-cols-2`)

2.12 WHEN the stage bundle API test generates mock song data THEN each strophe in the mock SHALL include a `markups` array (can be empty `[]`), so the route can safely access `strophe.markups[0]?.timecodeMs` without error

2.13 WHEN the ETag determinism test generates mock song data THEN each strophe in the mock SHALL include a `markups` array (can be empty `[]`), matching the Prisma select structure used by the bundle route

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `validateAnalyseResponse` receives invalid JSON, missing fields, wrong types, or structurally invalid data THEN the system SHALL CONTINUE TO throw descriptive error messages for each validation case

3.2 WHEN `analyzeSong()` is called with correct ownership and valid data THEN the system SHALL CONTINUE TO return a consistent `SongAnalyseResult` with `songAnalyse`, `emotionsTags`, and `strophenAnalysen`

3.3 WHEN `analyzeSong()` is called on a foreign song (userId !== song.userId) THEN the system SHALL CONTINUE TO throw `AnalyseError` with status 403

3.4 WHEN `analyzeSong()` is called while another analysis is active for the same song THEN the system SHALL CONTINUE TO throw `AnalyseError` with status 409

3.5 WHEN `addSongToSet()` and `removeSongFromSet()` are called THEN the system SHALL CONTINUE TO correctly associate and disassociate songs from sets

3.6 WHEN a song is deleted via `deleteSong()` THEN the system SHALL CONTINUE TO cascade-delete all related strophen, zeilen, markups, sessions, fortschritte, and notizen

3.7 WHEN the dashboard API is called by an authenticated user THEN the system SHALL CONTINUE TO return all required `DashboardData` fields including `activeSongCount`, `totalSessions`, `averageProgress`, and `streak`

3.8 WHEN `serializeTheme` and `deserializeTheme` are called with a complete `ThemeConfig` THEN the system SHALL CONTINUE TO produce a deep-equal roundtrip result

3.9 WHEN `ModeTabs`, `InterpretationTab`, and `NotesTab` components are checked for ARIA attributes THEN the system SHALL CONTINUE TO have correct `role="tablist"`, `role="tab"`, `aria-selected`, and `aria-label` attributes

3.10 WHEN the song card grid renders songs THEN the system SHALL CONTINUE TO render exactly one `SongCard` per song in the grid

3.11 WHEN the stage bundle API is called by an authenticated user THEN the system SHALL CONTINUE TO return all songs, sets, strophen, and zeilen with an ETag header

3.12 WHEN identical data is serialized for ETag computation THEN the system SHALL CONTINUE TO produce identical ETag hashes (determinism)
