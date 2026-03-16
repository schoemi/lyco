# Implementation Plan: Song CRUD UI

## Overview

Implement full CRUD support for Songs, Strophen, and Zeilen in the SongText Trainer. This involves creating new service layers (strophe-service, zeile-service), new API routes, new TypeScript types, and five new UI components — all wired into the existing Dashboard and Song Detail pages. The implementation builds bottom-up: types → services → API routes → UI components → page integration.

## Tasks

- [x] 1. Extend TypeScript types for Strophe/Zeile CRUD
  - Add `CreateStropheInput`, `UpdateStropheInput`, `ReorderItem`, `CreateZeileInput`, `UpdateZeileInput` interfaces to `src/types/song.ts`
  - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.6, 12.8_

- [x] 2. Implement Strophe service and API routes
  - [x] 2.1 Create `src/lib/services/strophe-service.ts`
    - Implement `createStrophe(userId, songId, data)` — ownership check, auto orderIndex
    - Implement `updateStrophe(userId, songId, stropheId, data)` — ownership + existence check
    - Implement `deleteStrophe(userId, songId, stropheId)` — cascade delete via Prisma
    - Implement `reorderStrophen(userId, songId, order)` — batch update orderIndex values
    - All functions validate inputs and throw typed errors (not found, access denied, validation)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.9, 12.10, 12.11_

  - [x] 2.2 Write property test: Strophe ownership enforcement
    - **Property 1: Strophe ownership enforcement**
    - Verify that createStrophe/updateStrophe/deleteStrophe reject requests where song.userId !== userId
    - **Validates: Requirements 12.10**

  - [x] 2.3 Write property test: Strophe orderIndex auto-assignment
    - **Property 2: Strophe orderIndex auto-assignment**
    - Verify that newly created strophen always receive the next sequential orderIndex
    - **Validates: Requirements 4.3, 12.1**

  - [x] 2.4 Create Strophe API route handlers
    - Create `src/app/api/songs/[id]/strophen/route.ts` (POST)
    - Create `src/app/api/songs/[id]/strophen/[stropheId]/route.ts` (PUT, DELETE)
    - Create `src/app/api/songs/[id]/strophen/reorder/route.ts` (PUT)
    - Follow existing pattern from `src/app/api/songs/[id]/route.ts` for auth/error handling
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.9, 12.10, 12.11_

  - [x] 2.5 Write property test: Strophe API auth and error responses
    - **Property 3: Strophe API auth and error responses**
    - Verify 401 for unauthenticated, 403 for wrong owner, 404 for missing resources, 400 for invalid input
    - **Validates: Requirements 12.9, 12.10, 12.11**

- [x] 3. Implement Zeile service and API routes
  - [x] 3.1 Create `src/lib/services/zeile-service.ts`
    - Implement `createZeile(userId, songId, stropheId, data)` — ownership chain check, auto orderIndex
    - Implement `updateZeile(userId, songId, stropheId, zeileId, data)` — full chain validation
    - Implement `deleteZeile(userId, songId, stropheId, zeileId)` — cascade delete via Prisma
    - Implement `reorderZeilen(userId, songId, stropheId, order)` — batch update orderIndex values
    - All functions validate the full ownership chain: song → strophe → zeile
    - _Requirements: 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11_

  - [x] 3.2 Write property test: Zeile ownership chain enforcement
    - **Property 4: Zeile ownership chain enforcement**
    - Verify that zeile operations reject requests where any link in the chain (song owner, strophe belongs to song, zeile belongs to strophe) is invalid
    - **Validates: Requirements 12.10, 12.11**

  - [x] 3.3 Write property test: Zeile orderIndex auto-assignment
    - **Property 5: Zeile orderIndex auto-assignment**
    - Verify that newly created zeilen always receive the next sequential orderIndex within their strophe
    - **Validates: Requirements 8.3, 12.5**

  - [x] 3.4 Create Zeile API route handlers
    - Create `src/app/api/songs/[id]/strophen/[stropheId]/zeilen/route.ts` (POST)
    - Create `src/app/api/songs/[id]/strophen/[stropheId]/zeilen/[zeileId]/route.ts` (PUT, DELETE)
    - Create `src/app/api/songs/[id]/strophen/[stropheId]/zeilen/reorder/route.ts` (PUT)
    - Follow existing pattern from `src/app/api/songs/[id]/route.ts` for auth/error handling
    - _Requirements: 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11_

  - [x] 3.5 Write property test: Zeile API auth and error responses
    - **Property 6: Zeile API auth and error responses**
    - Verify 401 for unauthenticated, 403 for wrong owner, 404 for missing resources, 400 for invalid input
    - **Validates: Requirements 12.9, 12.10, 12.11**

- [x] 4. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Song CRUD UI components
  - [x] 5.1 Create `src/components/songs/song-create-dialog.tsx`
    - Modal dialog with Titel (required), Künstler, Sprache, Emotions-Tags fields
    - POST to `/api/songs`, loading state on submit button, error display
    - Focus management: focus title field on open, return focus to trigger on close
    - Escape key closes dialog
    - `aria-required`, `aria-invalid`, `aria-describedby` for validation errors
    - Follow pattern from `src/components/admin/user-create-dialog.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 14.1, 14.3, 14.6_

  - [x] 5.2 Create `src/components/songs/song-edit-form.tsx`
    - Inline form on Song Detail page, pre-filled with current values
    - PUT to `/api/songs/[id]`, loading state, error display
    - Validation: title must not be empty
    - `aria-required`, `aria-invalid`, `aria-describedby` for required fields and errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 14.5, 14.7_

  - [x] 5.3 Create `src/components/songs/song-delete-dialog.tsx`
    - Modal confirmation dialog showing song title and cascade warning
    - DELETE to `/api/songs/[id]`, loading state, error display
    - Focus on cancel button on open, return focus on close
    - Escape key closes dialog
    - Follow pattern from `src/components/admin/user-delete-dialog.tsx`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 14.2, 14.4_

  - [x] 5.4 Write unit tests for Song CRUD dialogs
    - Test song-create-dialog: form submission, validation, loading state, focus management
    - Test song-delete-dialog: confirmation flow, cancel, loading state
    - Test song-edit-form: pre-filled values, validation, save/cancel
    - _Requirements: 1.5, 2.5, 3.2_

- [x] 6. Implement Strophe Editor component
  - [x] 6.1 Create `src/components/songs/strophe-editor.tsx`
    - Display all strophen with inline name editing (click edit → text field → confirm/cancel)
    - "+ Strophe hinzufügen" button at bottom, POST to strophen API
    - Delete button with confirmation dialog, DELETE to strophen API
    - Up/Down reorder buttons with `aria-label` (e.g. "Strophe Verse 1 nach oben verschieben")
    - First up-button and last down-button disabled
    - `aria-live="polite"` status messages on add/delete/reorder
    - Validation: name required
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 14.8, 14.10_

  - [x] 6.2 Write property test: Strophe reorder boundary enforcement
    - **Property 7: Strophe reorder boundary enforcement**
    - Verify that the first strophe cannot move up and the last strophe cannot move down
    - **Validates: Requirements 7.4, 7.5**

  - [x] 6.3 Write unit tests for Strophe Editor
    - Test add strophe flow, inline edit, delete confirmation, reorder buttons
    - _Requirements: 4.1, 5.1, 6.1, 7.1_

- [x] 7. Implement Zeile Editor component
  - [x] 7.1 Create `src/components/songs/zeile-editor.tsx`
    - Display all zeilen within a strophe with inline editing (text + übersetzung fields)
    - "+ Zeile hinzufügen" button at bottom, POST to zeilen API
    - Delete button with confirmation, DELETE to zeilen API
    - Up/Down reorder buttons with `aria-label` (e.g. "Zeile 1 nach oben verschieben")
    - First up-button and last down-button disabled
    - `aria-live="polite"` status messages on add/delete/reorder
    - Validation: text required
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.9, 14.10_

  - [x] 7.2 Write property test: Zeile reorder boundary enforcement
    - **Property 8: Zeile reorder boundary enforcement**
    - Verify that the first zeile cannot move up and the last zeile cannot move down
    - **Validates: Requirements 11.4, 11.5**

  - [x] 7.3 Write unit tests for Zeile Editor
    - Test add zeile flow, inline edit, delete confirmation, reorder buttons
    - _Requirements: 8.1, 9.1, 10.1, 11.1_

- [x] 8. Checkpoint — UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integrate components into pages
  - [x] 9.1 Update Dashboard page (`src/app/(main)/dashboard/page.tsx`)
    - Add "+ Neuer Song" button in the song list area
    - Show button in empty state alongside existing "Song importieren" link
    - Wire button to open `SongCreateDialog`
    - On song created: refresh song list
    - _Requirements: 13.1, 13.2, 13.3, 1.4_

  - [x] 9.2 Update Song Detail page (`src/app/(main)/songs/[id]/page.tsx`)
    - Add "Bearbeiten" button in song header → toggle `SongEditForm`
    - Add "Löschen" button → open `SongDeleteDialog`, redirect to dashboard on success
    - Replace static strophe rendering with `StropheEditor` component
    - Wire `ZeilenEditor` inside each strophe in `StropheEditor`
    - On any change: refresh song detail data
    - _Requirements: 2.1, 3.1, 3.4, 4.1, 8.1_

  - [x] 9.3 Write integration tests for page wiring
    - Test Dashboard: "+ Neuer Song" button opens dialog, song appears after creation
    - Test Song Detail: edit/delete buttons, strophe/zeile editors render
    - _Requirements: 13.1, 13.3, 2.1, 3.1_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All UI text is in German, consistent with the existing app
