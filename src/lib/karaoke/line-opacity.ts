import type { DisplayMode, FlatLine } from "@/types/karaoke";

/**
 * Calculates the opacity for a given line based on the active line and display mode.
 *
 * | Mode        | Active line | Same strophe | Other strophe |
 * |-------------|-------------|--------------|---------------|
 * | einzelzeile | 1.0         | —            | —             |
 * | strophe     | 1.0         | 0.4          | —             |
 * | song        | 1.0         | 0.6          | 0.3           |
 */
export function getLineOpacity(
  line: FlatLine,
  activeLine: FlatLine,
  displayMode: DisplayMode
): number {
  const isActive = line.globalIndex === activeLine.globalIndex;

  if (isActive) {
    return 1.0;
  }

  switch (displayMode) {
    case "einzelzeile":
      return 0;
    case "strophe":
      return line.stropheId === activeLine.stropheId ? 0.4 : 0;
    case "song":
      return line.stropheId === activeLine.stropheId ? 0.6 : 0.3;
    case "keinText":
      return 0;
  }
}
