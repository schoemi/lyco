# Missing Editor Icons Bugfix Design

## Overview

Icon buttons in the song editing view (Strophe and Zeile editors) are invisible because the `AppIcon` component applies `color: var(--color-icon)` via inline style, but the CSS variable resolves to the CSS "guaranteed-invalid value" before `ThemeHydrator` runs. The fix adds a `currentColor` fallback to the CSS variable reference in `AppIcon`, ensuring icons are always visible while preserving full theme customization once the theme loads.

## Glossary

- **Bug_Condition (C)**: The condition where `--color-icon` resolves to the CSS guaranteed-invalid value — occurs when the `@theme inline` self-reference in `globals.css` is not yet overridden by an inline style on `<html>`
- **Property (P)**: Icons rendered by `AppIcon` are always visible, using `currentColor` as fallback when `--color-icon` is not yet resolved
- **Preservation**: Theme-defined icon colors and explicit `color` prop overrides continue to work exactly as before once `ThemeHydrator` has applied the theme
- **AppIcon**: The centralized icon component in `src/components/ui/iconify-icon.tsx` that wraps Iconify's `<Icon>` and applies `color: var(--color-icon)` via inline style
- **ThemeHydrator**: Client component in `src/components/ThemeHydrator.tsx` that fetches theme config from `/api/theme` and sets CSS custom properties on `<html>` via `document.documentElement.style.setProperty`
- **`@theme inline` block**: The Tailwind v4 theme registration block in `globals.css` that maps CSS custom properties to Tailwind design tokens using self-referencing declarations like `--color-icon: var(--color-icon)`
- **guaranteed-invalid value**: Per CSS spec, a custom property that references itself resolves to the guaranteed-invalid value, making any `var()` reference to it behave as if the property were not set (with no fallback)

## Bug Details

### Bug Condition

The bug manifests when `AppIcon` renders an icon and the `--color-icon` CSS variable has not been resolved to a concrete color value. The `@theme inline` block in `globals.css` declares `--color-icon: var(--color-icon)` — a self-referencing declaration. While the server-side layout in `layout.tsx` applies theme variables as inline styles on `<html>`, the Tailwind-generated `@theme inline` declaration can override or conflict with the inline style during CSS cascade resolution, causing the variable to resolve to the guaranteed-invalid value. Since `AppIcon` uses `var(--color-icon)` without a fallback, the `color` property becomes effectively unset, rendering the SVG icon invisible (transparent).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { iconName: string, colorProp: string | undefined, cssVarResolved: boolean }
  OUTPUT: boolean
  
  RETURN input.colorProp IS undefined
         AND input.cssVarResolved IS false
END FUNCTION
```

### Examples

- **Strophe Instrumental icon**: `<AppIcon icon="lucide:music" />` renders in `strophe-editor.tsx` — the music icon is invisible because `var(--color-icon)` resolves to the guaranteed-invalid value, while the adjacent ↑ ↓ text buttons remain visible
- **Zeile Edit icon**: `<AppIcon icon="lucide:pencil" />` renders in `zeile-editor.tsx` — the pencil icon is invisible, leaving an empty clickable area next to visible arrow buttons
- **Zeile Delete icon**: `<AppIcon icon="lucide:trash-2" />` renders in `zeile-editor.tsx` — the trash icon is invisible, making the delete action undiscoverable
- **Strophe with custom color prop**: `<AppIcon icon="lucide:music" color="#ff0000" />` — this would remain visible because the explicit `color` prop bypasses `var(--color-icon)` entirely (not affected by the bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `ThemeHydrator` has applied theme CSS variables, `AppIcon` must continue to use the theme-defined `--color-icon` color
- When a custom `color` prop is passed to `AppIcon`, it must continue to override both the CSS variable and any fallback
- Text-based ↑ ↓ arrow buttons in `strophe-editor.tsx` and `zeile-editor.tsx` must continue to display with their current styling
- All other `AppIcon` usages across the application (vocal tags, gamification, export, admin) must continue to render correctly with the theme color
- Admin theme configuration setting a custom `iconColor` must continue to apply to all `AppIcon` instances via `--color-icon`

**Scope:**
All inputs where `--color-icon` IS properly resolved (i.e., `ThemeHydrator` has run or server-side inline styles are applied) should be completely unaffected by this fix. The fix only changes behavior when `--color-icon` would otherwise resolve to the guaranteed-invalid value.

## Hypothesized Root Cause

Based on the bug analysis, the root cause is a CSS cascade issue involving Tailwind v4's `@theme inline` directive:

1. **Self-referencing CSS variable in `@theme inline`**: The `globals.css` file declares `--color-icon: var(--color-icon)` inside the `@theme inline` block. This is the standard Tailwind v4 pattern for registering runtime CSS variables as design tokens. However, per the CSS specification, a custom property that references itself resolves to the "guaranteed-invalid value."

2. **Cascade conflict with inline styles**: While `layout.tsx` applies `--color-icon: #7c3aed` (or the configured theme color) as an inline style on `<html>`, the `@theme inline` generated stylesheet declaration can interfere with resolution. The self-referencing declaration means that if the browser evaluates the `@theme inline` rule before or instead of the inline style, the variable becomes invalid.

3. **No fallback in `AppIcon`**: The `AppIcon` component uses `color: color ?? "var(--color-icon)"` in its inline style. When `--color-icon` resolves to the guaranteed-invalid value, the `var()` function has no fallback argument, so the `color` property receives no value. For SVG icons, this means the fill/stroke inherits nothing visible, rendering the icon transparent.

4. **Text buttons unaffected**: The ↑ ↓ arrow buttons use plain text characters that inherit `color` from their parent elements' Tailwind classes (e.g., `text-neutral-500`), which do not depend on `--color-icon`.

## Correctness Properties

Property 1: Bug Condition - Icons Visible Without Theme Variable

_For any_ `AppIcon` render where no explicit `color` prop is provided and the `--color-icon` CSS variable has not been resolved to a concrete value, the component SHALL apply a fallback color (via `var(--color-icon, currentColor)`) so that the icon inherits the parent element's text color and remains visible.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Theme Color Applied When Available

_For any_ `AppIcon` render where no explicit `color` prop is provided and the `--color-icon` CSS variable HAS been resolved to a concrete hex value by `ThemeHydrator`, the component SHALL use that theme-defined color, preserving the existing themed icon appearance. Additionally, when an explicit `color` prop is provided, it SHALL always take precedence over both the CSS variable and the fallback.

**Validates: Requirements 3.1, 3.2, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/components/ui/iconify-icon.tsx`

**Function**: `AppIcon`

**Specific Changes**:
1. **Add `currentColor` fallback to CSS variable reference**: Change the inline style from `color: color ?? "var(--color-icon)"` to `color: color ?? "var(--color-icon, currentColor)"`. This ensures that when `--color-icon` resolves to the guaranteed-invalid value, the icon falls back to `currentColor` (the inherited text color from the parent element), making it visible.

2. **No changes to `globals.css`**: The `@theme inline` self-referencing pattern is the standard Tailwind v4 approach for registering runtime CSS variables. Changing this would break the Tailwind design token integration. The fix belongs in the consumer (`AppIcon`), not the declaration.

3. **No changes to `ThemeHydrator`**: The hydrator correctly sets `--color-icon` on `<html>` once the theme API responds. The fix ensures icons are visible during the window before hydration completes.

4. **No changes to `layout.tsx`**: The server-side layout already applies theme variables as inline styles. The fix is purely a CSS fallback in the component.

5. **No changes to `strophe-editor.tsx` or `zeile-editor.tsx`**: These components correctly use `AppIcon` — the fix is centralized in the `AppIcon` component itself.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Render `AppIcon` in a test environment without setting `--color-icon` on the document element. Inspect the computed inline style to verify it lacks a fallback. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **No CSS variable set**: Render `<AppIcon icon="lucide:music" />` without `--color-icon` defined — verify the inline style is `color: var(--color-icon)` with no fallback (will demonstrate the bug on unfixed code)
2. **Strophe editor icons**: Render `StropheEditor` with mock data — verify that `AppIcon` instances produce invisible icons when `--color-icon` is unresolved (will fail on unfixed code)
3. **Zeile editor icons**: Render `ZeileEditor` with mock data — verify that `AppIcon` instances produce invisible icons when `--color-icon` is unresolved (will fail on unfixed code)

**Expected Counterexamples**:
- `AppIcon` renders with `style={{ color: "var(--color-icon)" }}` — no fallback value present
- When `--color-icon` is not set, the computed color is effectively transparent/unset

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderAppIcon_fixed(input.iconName, input.colorProp)
  ASSERT result.inlineStyle.color CONTAINS "currentColor" AS fallback
  ASSERT result.iconIsVisible IS true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderAppIcon_original(input) = renderAppIcon_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random icon names and color prop combinations to verify the component behaves identically for all non-buggy inputs
- It catches edge cases like empty strings, unusual color formats, or undefined props
- It provides strong guarantees that the fallback only activates when needed

**Test Plan**: Observe behavior on UNFIXED code first for cases where `color` prop is provided or `--color-icon` is set, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Explicit color prop preservation**: For any valid color string passed as `color` prop, verify the output inline style uses that exact color — unchanged by the fix
2. **Theme variable preservation**: When `--color-icon` is set on the document, verify `AppIcon` uses `var(--color-icon, currentColor)` which resolves to the theme color
3. **ClassName and label preservation**: Verify that `className`, `label`, `style`, and accessibility attributes are passed through identically

### Unit Tests

- Test `AppIcon` renders with `var(--color-icon, currentColor)` when no `color` prop is provided
- Test `AppIcon` renders with the explicit color when `color` prop is provided
- Test `AppIcon` passes through `className`, `label`, `style`, and ARIA attributes correctly
- Test edge cases: empty string color prop, undefined color prop, various icon names

### Property-Based Tests

- Generate random `{ colorProp, iconName }` inputs and verify: when `colorProp` is defined, the inline style uses `colorProp`; when undefined, the inline style uses `var(--color-icon, currentColor)`
- Generate random theme color hex values, set `--color-icon` on the document, render `AppIcon`, and verify the CSS variable reference includes the `currentColor` fallback
- Generate random combinations of `className`, `label`, and `style` props and verify they are passed through unchanged

### Integration Tests

- Render `StropheEditor` with mock strophen data and verify all `AppIcon` instances have the `currentColor` fallback in their inline styles
- Render `ZeileEditor` with mock zeilen data and verify all `AppIcon` instances have the `currentColor` fallback in their inline styles
- Verify that text-based ↑ ↓ buttons continue to render correctly alongside fixed icon buttons
