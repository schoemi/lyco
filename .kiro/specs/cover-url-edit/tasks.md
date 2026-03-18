# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - coverUrl wird von updateSong ignoriert
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: updateSong called with a coverUrl field
  - Test file: `__tests__/songs/cover-url-bugcondition.property.test.ts`
  - Use `fast-check` to generate arbitrary valid URL strings and null values for coverUrl
  - Mock `prisma.song.findUnique` to return an existing song, mock `prisma.song.update` to capture the update data
  - Call `updateSong(userId, songId, { coverUrl: generatedUrl })` and assert:
    - `prisma.song.update` was called with `data` containing `coverUrl: generatedUrl`
    - The returned song reflects the updated coverUrl
  - Also test with `coverUrl: null` to verify cover removal is supported
  - Run test on UNFIXED code - expect FAILURE (updateSong ignores coverUrl because it's not in UpdateSongInput and not added to updateData)
  - **EXPECTED OUTCOME**: Test FAILS - confirms the bug exists (coverUrl not persisted)
  - Document counterexamples found (e.g., "updateSong({coverUrl: 'https://example.com/cover.jpg'}) does not pass coverUrl to prisma.song.update")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4, 2.2, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Bestehende Song-Felder unverändert
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `__tests__/songs/cover-url-preservation.property.test.ts`
  - Observe behavior on UNFIXED code for non-buggy inputs (updates without coverUrl):
    - Observe: `updateSong(userId, songId, { titel: "Neuer Titel" })` updates titel correctly
    - Observe: `updateSong(userId, songId, { kuenstler: "Neuer Künstler" })` updates kuenstler correctly
    - Observe: `updateSong(userId, songId, { sprache: "en", emotionsTags: ["happy"] })` updates both fields
    - Observe: `updateSong(userId, songId, {})` performs no update (empty updateData)
  - Use `fast-check` to generate arbitrary combinations of `{ titel, kuenstler, sprache, emotionsTags }` (all optional)
  - Mock `prisma.song.findUnique` and `prisma.song.update`, assert that:
    - Only provided fields appear in the `data` passed to `prisma.song.update`
    - `coverUrl` is never included in update data when not provided in input
    - Titel validation (empty string throws) still works
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: coverUrl-Bearbeitung auf der Song-Detailseite

  - [x] 3.1 Add coverUrl to UpdateSongInput type
    - In `src/types/song.ts`, add `coverUrl?: string | null` to the `UpdateSongInput` interface
    - _Bug_Condition: isBugCondition(input) where input.action = "setCoverUrl" and UpdateSongInput lacks coverUrl field_
    - _Expected_Behavior: UpdateSongInput accepts coverUrl as optional string or null_
    - _Requirements: 2.4_

  - [x] 3.2 Update updateSong service to handle coverUrl
    - In `src/lib/services/song-service.ts`, add `if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;` in the `updateSong` function, after the existing field assignments
    - _Bug_Condition: updateSong ignores coverUrl because it's not extracted from data into updateData_
    - _Expected_Behavior: updateSong persists coverUrl when provided, analogous to other fields_
    - _Preservation: Existing fields (titel, kuenstler, sprache, emotionsTags) continue to work unchanged_
    - _Requirements: 2.2, 2.4, 3.1_

  - [x] 3.3 Create CoverManager component
    - New file: `src/components/songs/cover-manager.tsx`
    - Client component ("use client") analog to AudioQuellenManager pattern
    - Props: `songId: string`, `coverUrl: string | null`, `onCoverChanged: () => void`
    - Features:
      - Cover preview (Image with fallback) when coverUrl is set
      - Toggle between "URL eingeben" and "Datei hochladen" modes
      - URL input field with "Speichern" button (calls PUT `/api/songs/[id]` with `{ coverUrl }`)
      - File upload area (calls POST `/api/songs/[id]/cover/upload`, accepts JPEG/PNG/WebP, max 5 MB)
      - "Entfernen" button to set coverUrl to null via PUT
      - Loading and error states
      - German labels consistent with the rest of the app
    - _Expected_Behavior: CoverManager renders and allows URL input, file upload, preview, and removal_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Integrate CoverManager into song detail page
    - In `src/app/(main)/songs/[id]/page.tsx`:
      - Import CoverManager component
      - Add a "Cover-Bild" section before the "Audio-Quellen" section
      - Pass `songId={id}`, `coverUrl={song.coverUrl}`, `onCoverChanged={refreshSong}`
    - _Expected_Behavior: Song detail page renders CoverManager component with correct props_
    - _Requirements: 2.1_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - coverUrl wird von updateSong persistiert
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (coverUrl persisted via updateSong)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `__tests__/songs/cover-url-bugcondition.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2, 2.4_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Bestehende Song-Felder unverändert
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run `__tests__/songs/cover-url-preservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Write unit tests for CoverManager component
  - Test file: `__tests__/songs/cover-manager.test.ts`
  - Use `@testing-library/react` and `vitest`
  - Test cases:
    - Renders cover preview when coverUrl is provided
    - Renders placeholder when coverUrl is null
    - URL input mode: entering a URL and clicking "Speichern" calls PUT endpoint
    - File upload mode: uploading a file calls POST `/api/songs/[id]/cover/upload`
    - "Entfernen" button calls PUT with `{ coverUrl: null }`
    - Shows loading state during save/upload
    - Shows error message on API failure
    - Toggle between URL and upload modes works correctly
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Run full test suite to verify no regressions
  - Ensure all property tests (bugcondition + preservation) pass
  - Ensure CoverManager unit tests pass
  - Ask the user if questions arise
