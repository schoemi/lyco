# Preservation Baseline

## Date Established

Baseline recorded on unfixed code, before any bugfix changes.

## Test Suite Summary (Excluding 16 Affected Files)

- **Total test files**: 325
- **Passing test files**: 316
- **Failing test files**: 9 (pre-existing failures, NOT related to this bugfix spec)
- **Total tests**: 2,545
- **Passing tests**: 2,524
- **Failing tests**: 21 (pre-existing)

## Excluded Files (16 Affected by This Bugfix)

The following 16 files were excluded from the preservation baseline run:

1. `__tests__/smart-analysis/response-validation.property.test.ts`
2. `__tests__/smart-analysis/access-control.property.test.ts`
3. `__tests__/smart-analysis/concurrency-guard.property.test.ts`
4. `__tests__/smart-analysis/error-logging.property.test.ts`
5. `__tests__/smart-analysis/analysis-overwrite.property.test.ts`
6. `__tests__/smart-analysis/analysis-roundtrip.property.test.ts`
7. `__tests__/songs/set-delete-preserves-songs.property.test.ts`
8. `__tests__/songs/set-song-association.property.test.ts`
9. `__tests__/songs/song-cascade-delete.property.test.ts`
10. `__tests__/gamification/dashboard-metriken.test.ts`
11. `__tests__/theming/serializer-roundtrip.property.test.ts`
12. `__tests__/emotional/aria-attributes.property.test.ts`
13. `__tests__/ui/song-accessibility.property.test.ts`
14. `__tests__/songs/song-card-grid-responsive.property.test.ts`
15. `__tests__/stage/bundle-api.property.test.ts`
16. `__tests__/stage/etag-determinism.property.test.ts`

## Pre-Existing Failures (9 Files, 21 Tests)

These failures exist on the current unfixed code and are NOT part of this bugfix spec. They must remain unchanged after fixes are applied.

### 1. `__tests__/smart-analysis/llm-client.test.ts` (1 failure)

- **Test**: "creates client with env vars"
- **Cause**: Test expects `maxRetries: 2, timeout: 30000` but implementation uses `maxRetries: 4, timeout: 60000`

### 2. `__tests__/genius/genius-search-api.test.ts` (2 failures)

- **Test**: "gibt 502 zurück wenn Genius-API fehlschlägt"
  - **Cause**: Test expects `"Genius-Suche fehlgeschlagen"` but receives `"Genius-Suche fehlgeschlagen: Genius API down"`
- **Test**: "gibt 200 zurück bei leerer Query"
  - **Cause**: Test expects status 200 for empty query but receives 400

### 3. `__tests__/smart-analysis/analyse-service.test.ts` (1 failure)

- **Test**: "throws when strophenAnalysen count does not match"
- **Cause**: Same root cause as Req 1.1 — `validateAnalyseResponse` now tolerates strophen count mismatch (warns instead of throwing). This is a unit test in a different file from the property test.

### 4. `__tests__/auth/access-control.property.test.ts` (3 failures)

- **Tests**: All 3 role-based access control tests
- **Cause**: `Cannot find module 'next/server'` — environment/module resolution issue

### 5. `__tests__/auth/cookie-security.property.test.ts` (2 failures)

- **Tests**: Cookie security attribute checks
- **Cause**: Cookie `secure` flag is `false` in test environment

### 6. `__tests__/audio/audio-player.test.ts` (9 failures)

- **Tests**: All 9 AudioPlayer unit tests
- **Cause**: `useSharedAudio must be used within SharedAudioProvider` — missing context provider in test setup

### 7. `__tests__/audio/seek-mp3-only.property.test.ts` (1 failure)

- **Test**: "seekTo returns false for every non-MP3 AudioTyp"
- **Cause**: Same SharedAudioProvider missing issue as audio-player.test.ts

### 8. `__tests__/audio/timecode-upsert.property.test.ts` (1 failure)

- **Test**: "first save POSTs, second save PUTs"
- **Cause**: Placeholder text mismatch — test expects `[mm:ss]` but component uses `mm:ss`

### 9. `__tests__/audio/audio-quellen-manager.test.ts` (1 failure)

- **Test**: "renders existing audio sources in a list"
- **Cause**: Multiple elements found with text "Instrumental" (label appears in both dropdown option and list item)

## Preservation Verification Command

To re-verify the preservation baseline after fixes, run:

```bash
npx vitest --run \
  --exclude '__tests__/smart-analysis/response-validation.property.test.ts' \
  --exclude '__tests__/smart-analysis/access-control.property.test.ts' \
  --exclude '__tests__/smart-analysis/concurrency-guard.property.test.ts' \
  --exclude '__tests__/smart-analysis/error-logging.property.test.ts' \
  --exclude '__tests__/smart-analysis/analysis-overwrite.property.test.ts' \
  --exclude '__tests__/smart-analysis/analysis-roundtrip.property.test.ts' \
  --exclude '__tests__/songs/set-delete-preserves-songs.property.test.ts' \
  --exclude '__tests__/songs/set-song-association.property.test.ts' \
  --exclude '__tests__/songs/song-cascade-delete.property.test.ts' \
  --exclude '__tests__/gamification/dashboard-metriken.test.ts' \
  --exclude '__tests__/theming/serializer-roundtrip.property.test.ts' \
  --exclude '__tests__/emotional/aria-attributes.property.test.ts' \
  --exclude '__tests__/ui/song-accessibility.property.test.ts' \
  --exclude '__tests__/songs/song-card-grid-responsive.property.test.ts' \
  --exclude '__tests__/stage/bundle-api.property.test.ts' \
  --exclude '__tests__/stage/etag-determinism.property.test.ts'
```

## Expected Post-Fix Result

After all bugfix changes are applied, re-running the above command should produce:

- **Same 316 passing test files**
- **Same 9 failing test files** (pre-existing, unchanged)
- **Same 2,524 passing tests**
- **Same 21 failing tests** (pre-existing, unchanged)

Any deviation from these numbers indicates a regression introduced by the bugfix.
