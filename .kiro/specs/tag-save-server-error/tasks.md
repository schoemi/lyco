# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - POST mit gültigen Tag-Daten gibt HTTP 500 statt HTTP 201
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to valid CreateTagDefinitionInput objects sent by an authenticated ADMIN user where the tag does not already exist
  - Create test file `__tests__/vocal-tag/tag-save-bugcondition.property.test.ts`
  - Mock `@/lib/auth` to return an ADMIN session
  - Mock `@/lib/prisma` with `findUnique` returning `null` (no duplicate) and `create` throwing a non-Error object (e.g. `{ message: "adapter error" }`) to simulate the PrismaPg adapter behavior
  - Use fast-check to generate valid tag inputs: tag (lowercase alphanumeric), label (non-empty string), icon (FontAwesome class with space like `"fa-solid fa-microphone"`), color (hex string), indexNr (non-negative integer)
  - Assert that `POST` returns HTTP 201 with the created tag definition containing all fields (id, tag, label, icon, color, indexNr)
  - Also test: when `prisma.create` throws a non-Error object with message matching the duplicate error, the handler should return HTTP 409 (not 500)
  - Run test on UNFIXED code - expect FAILURE (HTTP 500 instead of 201, and 500 instead of 409 for non-Error duplicate errors)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Bestehende Auth-, Validierungs- und Duplikat-Fehlerbehandlung
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `__tests__/vocal-tag/tag-save-preservation.property.test.ts`
  - Mock `@/lib/auth` and `@/lib/prisma` as in existing tests
  - Observe on UNFIXED code: unauthenticated POST → HTTP 401 `{ error: "Nicht authentifiziert" }`
  - Observe on UNFIXED code: USER-role POST → HTTP 403 `{ error: "Keine Berechtigung" }`
  - Observe on UNFIXED code: POST with missing/empty required fields → HTTP 400 with field-specific error
  - Observe on UNFIXED code: POST with non-number indexNr → HTTP 400
  - Observe on UNFIXED code: POST with duplicate tag (findUnique returns existing, service throws Error) → HTTP 409
  - Write property-based tests with fast-check:
    - For all non-authenticated sessions: POST returns 401
    - For all non-ADMIN roles with valid body: POST returns 403, no DB writes
    - For all bodies missing at least one required field: POST returns 400
    - For all duplicate tags (findUnique returns existing record, service throws standard Error): POST returns 409
  - Verify tests PASS on UNFIXED code
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix für Tag-Save Server Error

  - [x] 3.1 Implement the fix
    - In `src/app/api/tag-definitions/route.ts` POST catch block: replace `error instanceof Error` check with robust error message extraction that handles non-Error objects (plain objects with `message` property, strings, etc.)
    - Add helper function `extractErrorMessage(error: unknown): string` that extracts message from Error instances, objects with `message` property, strings, and falls back to `String(error)`
    - Update duplicate-tag check to use extracted message string instead of `instanceof Error`
    - In `src/lib/services/tag-definition-service.ts` `createTagDefinition`: wrap `prisma.tagDefinition.create()` in try-catch that re-throws adapter errors as standard `Error` objects
    - Improve `console.error` logging to include `typeof error` and `error?.constructor?.name` for future debugging
    - _Bug_Condition: isBugCondition(input) where input is valid POST from ADMIN and prisma.create throws non-Error object_
    - _Expected_Behavior: POST returns HTTP 201 with created tag, or specific error (409 for duplicates) instead of generic 500_
    - _Preservation: Auth checks (401/403), validation (400), duplicate detection (409), GET/PUT/DELETE unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - POST mit gültigen Tag-Daten gibt HTTP 201
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `npx vitest --run __tests__/vocal-tag/tag-save-bugcondition.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Bestehende Fehlerbehandlung unverändert
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run `npx vitest --run __tests__/vocal-tag/tag-save-preservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npx vitest --run __tests__/vocal-tag/tag-save-bugcondition.property.test.ts __tests__/vocal-tag/tag-save-preservation.property.test.ts`
  - Ensure both property test files pass
  - Run existing tag definition tests: `npx vitest --run __tests__/vocal-tag/tag-definition-api.test.ts __tests__/vocal-tag/tag-definition-service.test.ts`
  - Ensure no regressions in existing test suite
  - Ask the user if questions arise
