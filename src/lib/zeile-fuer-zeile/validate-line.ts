/**
 * Validates a user's line input against the target line.
 * Comparison is case-insensitive and trims whitespace.
 */
export function validateLine(input: string, target: string): boolean {
  return input.trim().toLowerCase() === target.trim().toLowerCase();
}
