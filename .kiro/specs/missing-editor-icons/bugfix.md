# Bugfix Requirements Document

## Introduction

In the song editing view (Bearbeitungsansicht), icon buttons rendered via the `AppIcon` component are invisible. This affects both the Strophe level (Instrumental, Edit, Delete icons) and the Zeile level (Kommentar, Edit, Delete icons). Only the plain-text arrow buttons (↑ ↓) remain visible because they do not rely on `AppIcon`.

The root cause is that the `AppIcon` component applies `color: var(--color-icon)` via an inline style. The `--color-icon` CSS variable is declared in `globals.css` inside a `@theme inline` block as `--color-icon: var(--color-icon)` — a self-referencing declaration that resolves to the CSS "guaranteed-invalid value" when no theme override has been applied to the `<html>` element yet. This means that before `ThemeHydrator` runs (or if it fails), the icon color is effectively unset, rendering icons invisible. The text-based arrows are unaffected because they inherit normal text color from their parent elements rather than relying on `--color-icon`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `AppIcon` component renders an icon and the `--color-icon` CSS variable has not yet been set on the `<html>` element by `ThemeHydrator` (e.g., during initial page load, SSR, or if the theme API call fails) THEN the system renders the icon with no visible color, making it invisible to the user

1.2 WHEN the `AppIcon` component renders an icon in `strophe-editor.tsx` (Instrumental music icon, pencil edit icon, trash delete icon) THEN the system shows empty/invisible button areas where icons should appear, while the adjacent text-based ↑ ↓ arrow buttons remain visible

1.3 WHEN the `AppIcon` component renders an icon in `zeile-editor.tsx` (message-square comment icon, pencil edit icon, trash delete icon) THEN the system shows empty/invisible button areas where icons should appear, while the adjacent text-based ↑ ↓ arrow buttons remain visible

### Expected Behavior (Correct)

2.1 WHEN the `AppIcon` component renders an icon and the `--color-icon` CSS variable has not yet been set by `ThemeHydrator` THEN the system SHALL display the icon using a sensible fallback color (e.g., `currentColor` or a hardcoded default) so that icons are always visible

2.2 WHEN the `AppIcon` component renders an icon in `strophe-editor.tsx` (Instrumental, Edit, Delete) THEN the system SHALL display all icon buttons visibly, consistent with the adjacent ↑ ↓ arrow buttons

2.3 WHEN the `AppIcon` component renders an icon in `zeile-editor.tsx` (Kommentar, Edit, Delete) THEN the system SHALL display all icon buttons visibly, consistent with the adjacent ↑ ↓ arrow buttons

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `ThemeHydrator` has successfully applied the theme CSS variables to the `<html>` element THEN the system SHALL CONTINUE TO use the theme-defined `--color-icon` color for all `AppIcon` instances

3.2 WHEN a custom `color` prop is passed to the `AppIcon` component THEN the system SHALL CONTINUE TO use the explicitly provided color, overriding both the CSS variable and any fallback

3.3 WHEN the text-based ↑ ↓ arrow buttons are rendered in `strophe-editor.tsx` and `zeile-editor.tsx` THEN the system SHALL CONTINUE TO display them with their current styling and behavior

3.4 WHEN `AppIcon` is used in other parts of the application (e.g., vocal tags, gamification, export buttons, admin pages) THEN the system SHALL CONTINUE TO render icons correctly with the theme color once the theme is loaded

3.5 WHEN the admin theme configuration sets a custom `iconColor` value THEN the system SHALL CONTINUE TO apply that custom color to all `AppIcon` instances via the `--color-icon` CSS variable
