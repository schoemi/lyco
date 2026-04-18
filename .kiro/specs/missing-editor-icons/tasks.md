# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Icons Invisible Without CSS Variable Fallback
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in `AppIcon`
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — `AppIcon` rendered without an explicit `color` prop, where `--color-icon` is not set on the document
  - Create test file `__tests__/ui/editor-icons-bugcondition.property.test.ts` with `@vitest-environment jsdom`
  - Import `AppIcon` from `@/components/ui/iconify-icon` and use `fast-check` with `@testing-library/react`
  - **Bug Condition from design**: `isBugCondition(input)` where `input.colorProp IS undefined AND input.cssVarResolved IS false`
  - Test 1a: Render `<AppIcon icon={randomIconName} />` without setting `--color-icon` on `document.documentElement` — assert the inline style contains `var(--color-icon, currentColor)` as fallback (will FAIL on unfixed code because it only has `var(--color-icon)`)
  - Test 1b: Generate random Iconify icon names (e.g., `lucide:music`, `lucide:pencil`, `lucide:trash-2`) — for each, render without `color` prop and verify the style includes `currentColor` fallback
  - Test 1c: Source-code analysis — read `src/components/ui/iconify-icon.tsx` and verify the inline style expression contains `currentColor` as a CSS fallback value
  - Run test on UNFIXED code with `npx vitest run __tests__/ui/editor-icons-bugcondition.property.test.ts`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `AppIcon` renders with `style={{ color: "var(--color-icon)" }}` — no `currentColor` fallback present)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Theme Color and Explicit Color Prop Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `__tests__/ui/editor-icons-preservation.property.test.ts` with `@vitest-environment jsdom`
  - Import `AppIcon` from `@/components/ui/iconify-icon` and use `fast-check` with `@testing-library/react`
  - **Observation phase**: Run UNFIXED code to observe baseline behavior for non-buggy inputs (cases where `isBugCondition` returns false)
  - Observe: When `color` prop is provided (e.g., `color="#ff0000"`), the inline style uses that exact color — this must be preserved
  - Observe: When `--color-icon` is set on `document.documentElement`, `AppIcon` references `var(--color-icon)` — the theme color is used
  - Observe: `className`, `label`, `style`, and ARIA attributes (`aria-hidden`, `aria-label`, `role`) are passed through unchanged
  - **Preservation Property 2a — Explicit color prop**: Generate random valid CSS color strings via `fast-check` (hex colors, named colors). For each, render `<AppIcon icon={randomIcon} color={randomColor} />` and assert the inline style `color` equals the provided color prop. This behavior must be identical before and after the fix.
  - **Preservation Property 2b — className and label passthrough**: Generate random `{ className, label, icon }` tuples. Render `AppIcon` and verify `className` is applied, `aria-label` matches `label` when provided, `aria-hidden` is true when no label, and `role="img"` is set when label is provided.
  - **Preservation Property 2c — Style override passthrough**: Generate random `style` objects (e.g., `{ fontSize: randomPx }`). Render `AppIcon` with `style` prop and verify the additional styles are merged into the element's inline style.
  - Run tests on UNFIXED code with `npx vitest run __tests__/ui/editor-icons-preservation.property.test.ts`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for invisible editor icons in AppIcon component

  - [x] 3.1 Implement the fix
    - In `src/components/ui/iconify-icon.tsx`, in the `AppIcon` function
    - Change the inline style from `color: color ?? "var(--color-icon)"` to `color: color ?? "var(--color-icon, currentColor)"`
    - This single-line change adds a CSS fallback so that when `--color-icon` resolves to the guaranteed-invalid value, the icon inherits `currentColor` from its parent element
    - No changes needed to `globals.css`, `ThemeHydrator.tsx`, `layout.tsx`, `strophe-editor.tsx`, or `zeile-editor.tsx`
    - _Bug_Condition: isBugCondition(input) where input.colorProp IS undefined AND input.cssVarResolved IS false_
    - _Expected_Behavior: AppIcon renders with `var(--color-icon, currentColor)` so icons fall back to parent text color when CSS variable is unresolved_
    - _Preservation: Explicit color prop still overrides; theme-defined --color-icon still takes precedence when resolved; className/label/style passthrough unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Icons Visible With currentColor Fallback
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (inline style contains `currentColor` fallback)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `npx vitest run __tests__/ui/editor-icons-bugcondition.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Theme Color and Explicit Color Prop Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `npx vitest run __tests__/ui/editor-icons-preservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation properties still hold: explicit color prop override, className/label passthrough, style merge
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite for the affected area: `npx vitest run __tests__/ui/`
  - Ensure both bug condition and preservation tests pass
  - Ensure no other UI tests have regressed
  - Ask the user if questions arise
