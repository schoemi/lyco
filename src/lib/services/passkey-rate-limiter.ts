/**
 * Rate limiter for passkey registration endpoints.
 *
 * Uses an in-memory sliding window approach (same pattern as upload-rate-limiter).
 * Limits: 5 registration attempts per IP within 15 minutes.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const registrationAttempts = new Map<string, number[]>();

export function checkPasskeyRegistrationRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = registrationAttempts.get(ip) ?? [];
  // Remove expired entries
  timestamps = timestamps.filter((t) => t > windowStart);
  registrationAttempts.set(ip, timestamps);

  if (timestamps.length >= MAX_ATTEMPTS) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  return { allowed: true };
}

/**
 * Resets the registration attempts for an IP. Useful for testing.
 * @internal
 */
export function resetPasskeyRegistrationRateLimit(ip: string): void {
  registrationAttempts.delete(ip);
}

/**
 * Clears all passkey registration rate limit data. Useful for testing.
 * @internal
 */
export function clearAllPasskeyRegistrationRateLimits(): void {
  registrationAttempts.clear();
}
