/**
 * Normalizes text for comparison: trims whitespace and converts to lowercase.
 * Used by the Diktat quiz to compare user input against the original text.
 */
export function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}
