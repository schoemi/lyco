/**
 * Generates a hint for a cloze gap word.
 * Format: first character + '···'
 */
export function generateHint(word: string): string {
  return word[0] + "···";
}
