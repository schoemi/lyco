/**
 * Determines whether a line should have a fade effect at the edges in Song mode.
 *
 * - "top": true if the line is one of the top 2 (index 0 or 1) AND activeLineIndex > 3
 * - "bottom": true if the line is one of the bottom 2 (index totalLines-1 or totalLines-2)
 *   AND totalLines - 1 - activeLineIndex > 3
 */
export function shouldFade(
  lineIndex: number,
  activeLineIndex: number,
  totalLines: number,
  position: "top" | "bottom"
): boolean {
  if (position === "top") {
    return lineIndex <= 1 && activeLineIndex > 3;
  }

  // position === "bottom"
  return lineIndex >= totalLines - 2 && totalLines - 1 - activeLineIndex > 3;
}
