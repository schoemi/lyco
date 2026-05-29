/**
 * Rate limiter for passkey authentication endpoints.
 *
 * Uses an in-memory sliding window approach (same pattern as passkey-rate-limiter).
 * Limits: 5 failed authentication attempts per IP within 15 minutes.
 *
 * Requirements: 3.9, 6.4
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const authenticationAttempts = new Map<string, number[]>();

/**
 * Check if an IP is rate-limited for passkey authentication.
 * Only call this on FAILED attempts (successful attempts don't count).
 */
export function checkPasskeyAuthRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = authenticationAttempts.get(ip) ?? [];
  // Remove expired entries
  timestamps = timestamps.filter((t) => t > windowStart);
  authenticationAttempts.set(ip, timestamps);

  if (timestamps.length >= MAX_ATTEMPTS) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Record a failed authentication attempt for an IP.
 */
export function recordFailedPasskeyAuth(ip: string): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = authenticationAttempts.get(ip) ?? [];
  // Remove expired entries
  timestamps = timestamps.filter((t) => t > windowStart);
  timestamps.push(now);
  authenticationAttempts.set(ip, timestamps);
}

/**
 * Resets the authentication attempts for an IP. Useful for testing.
 * @internal
 */
export function resetPasskeyAuthRateLimit(ip: string): void {
  authenticationAttempts.delete(ip);
}

/**
 * Clears all passkey authentication rate limit data. Useful for testing.
 * @internal
 */
export function clearAllPasskeyAuthRateLimits(): void {
  authenticationAttempts.clear();
}
