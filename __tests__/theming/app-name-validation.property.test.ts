/**
 * Property 5: Anwendungsname-Längenbegrenzung
 *
 * For every string with more than 50 characters, the ThemeConfig validation
 * should reject the value or truncate to 50 characters.
 * For every string with 1–50 characters, the value should be accepted.
 *
 * **Validates: Requirements 1.4**
 */

// Feature: theming-customization, Property 5: Anwendungsname-Längenbegrenzung

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateAppName,
  deserializeTheme,
  serializeTheme,
  getDefaultTheme,
} from '@/lib/theme/serializer';
import { APP_NAME_MAX_LENGTH } from '@/lib/theme/types';

describe('Property 5: Anwendungsname-Längenbegrenzung', () => {
  // --- validateAppName ---

  it('accepts every string with 1–50 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: APP_NAME_MAX_LENGTH }),
        (name) => {
          expect(validateAppName(name)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects every string with more than 50 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: APP_NAME_MAX_LENGTH + 1, maxLength: 200 }),
        (name) => {
          expect(validateAppName(name)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // --- deserializeTheme round-trip truncation ---

  it('truncates appName to 50 characters via deserializeTheme for strings > 50 chars', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: APP_NAME_MAX_LENGTH + 1, maxLength: 200 }),
        (longName) => {
          const theme = { ...getDefaultTheme(), appName: longName };
          const json = serializeTheme(theme);
          const result = deserializeTheme(json);

          expect(result.appName.length).toBeLessThanOrEqual(APP_NAME_MAX_LENGTH);
          expect(result.appName).toBe(longName.slice(0, APP_NAME_MAX_LENGTH));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('preserves appName via deserializeTheme for strings with 1–50 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: APP_NAME_MAX_LENGTH }).filter(
          (s) => s.trim().length > 0,
        ),
        (validName) => {
          const theme = { ...getDefaultTheme(), appName: validName };
          const json = serializeTheme(theme);
          const result = deserializeTheme(json);

          expect(result.appName).toBe(validName);
        },
      ),
      { numRuns: 100 },
    );
  });
});
