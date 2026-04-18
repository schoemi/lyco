const UPLOAD_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000; // 15 Minuten

const uploadTimestamps = new Map<string, number[]>();

export function checkUploadRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = uploadTimestamps.get(userId) ?? [];
  // Alte Einträge entfernen
  timestamps = timestamps.filter((t) => t > windowStart);
  uploadTimestamps.set(userId, timestamps);

  if (timestamps.length >= UPLOAD_LIMIT) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  return { allowed: true };
}

/**
 * Resets the upload timestamps for a user. Useful for testing.
 * @internal
 */
export function resetUploadRateLimit(userId: string): void {
  uploadTimestamps.delete(userId);
}

/**
 * Clears all upload rate limit data. Useful for testing.
 * @internal
 */
export function clearAllUploadRateLimits(): void {
  uploadTimestamps.clear();
}
