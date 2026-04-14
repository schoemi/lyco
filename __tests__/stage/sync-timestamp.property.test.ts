/**
 * Property 20: Sync-Zeitstempel-Persistenz
 *
 * Für jeden erfolgreichen Preflight-Check soll der Zeitstempel der
 * Synchronisation in localStorage gespeichert werden und nach dem
 * Neuladen der Seite korrekt angezeigt werden.
 *
 * **Validates: Requirements 4.6**
 */
// Feature: lyco-stage, Property 20: Sync-Zeitstempel-Persistenz

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import {
  saveLastSyncTimestamp,
  loadLastSyncTimestamp,
  STAGE_STORAGE_KEYS,
} from "@/lib/stage/storage";

// localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Property 20: Sync-Zeitstempel-Persistenz", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("saved timestamp can be loaded back correctly", () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
          .filter((d) => !isNaN(d.getTime())),
        (date) => {
          localStorageMock.clear();
          const isoString = date.toISOString();

          saveLastSyncTimestamp(isoString);
          const loaded = loadLastSyncTimestamp();

          expect(loaded).toBe(isoString);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("timestamp is stored under the correct localStorage key", () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
          .filter((d) => !isNaN(d.getTime())),
        (date) => {
          localStorageMock.clear();
          const isoString = date.toISOString();

          saveLastSyncTimestamp(isoString);

          // Verify it's stored under the expected key
          const raw = localStorageMock.getItem(STAGE_STORAGE_KEYS.lastSync);
          expect(raw).toBe(isoString);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null when no timestamp has been saved", () => {
    localStorageMock.clear();
    const loaded = loadLastSyncTimestamp();
    expect(loaded).toBeNull();
  });

  it("latest saved timestamp overwrites previous one", () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date("2020-01-01"), max: new Date("2025-01-01") })
          .filter((d) => !isNaN(d.getTime())),
        fc
          .date({ min: new Date("2025-01-02"), max: new Date("2030-12-31") })
          .filter((d) => !isNaN(d.getTime())),
        (earlier, later) => {
          localStorageMock.clear();

          saveLastSyncTimestamp(earlier.toISOString());
          saveLastSyncTimestamp(later.toISOString());

          const loaded = loadLastSyncTimestamp();
          expect(loaded).toBe(later.toISOString());
        },
      ),
      { numRuns: 100 },
    );
  });
});
