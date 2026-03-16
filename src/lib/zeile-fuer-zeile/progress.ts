/**
 * Calculates the progress percentage for a strophe based on completed lines.
 * Returns 0 when there are no lines (totalZeilen === 0).
 */
export function calculateStropheProgress(
  completedZeilen: number,
  totalZeilen: number
): number {
  if (totalZeilen === 0) return 0;
  return Math.round((completedZeilen / totalZeilen) * 100);
}
