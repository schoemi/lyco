/**
 * Validates a user's answer against the target word.
 * Comparison is case-insensitive and trims whitespace.
 */
export function validateAnswer(input: string, target: string): boolean {
  return input.trim().toLowerCase() === target.trim().toLowerCase();
}
