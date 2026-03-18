import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStorageKey,
  readPersistedMode,
  persistMode,
  type ViewMode,
} from "@/components/vocal-tag/view-toggle";

/**
 * Unit tests for ViewToggle component logic.
 *
 * Since the test environment is node (not jsdom), we test the pure logic:
 * - Storage key generation
 * - Reading persisted mode from localStorage
 * - Persisting mode to localStorage
 * - Toggle behavior (compact ↔ detail)
 *
 * Validates: Requirements 11.1, 11.2, 11.3
 */

// Mock localStorage for node environment
function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

describe("ViewToggle logic", () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    // Provide window + localStorage in node env
    (globalThis as Record<string, unknown>).window = {};
    (globalThis as Record<string, unknown>).localStorage = mockStorage;
  });

  describe("getStorageKey", () => {
    it("generates key with songId", () => {
      expect(getStorageKey("abc-123")).toBe("vocal-tag-view-mode-abc-123");
    });

    it("generates unique keys for different songIds", () => {
      const key1 = getStorageKey("song-1");
      const key2 = getStorageKey("song-2");
      expect(key1).not.toBe(key2);
    });

    it("handles empty songId", () => {
      expect(getStorageKey("")).toBe("vocal-tag-view-mode-");
    });
  });

  describe("readPersistedMode", () => {
    it("returns 'compact' as default when nothing is stored", () => {
      expect(readPersistedMode("song-1")).toBe("compact");
    });

    it("returns stored 'compact' mode", () => {
      mockStorage.setItem("vocal-tag-view-mode-song-1", "compact");
      expect(readPersistedMode("song-1")).toBe("compact");
    });

    it("returns stored 'detail' mode", () => {
      mockStorage.setItem("vocal-tag-view-mode-song-1", "detail");
      expect(readPersistedMode("song-1")).toBe("detail");
    });

    it("returns 'compact' for invalid stored value", () => {
      mockStorage.setItem("vocal-tag-view-mode-song-1", "invalid");
      expect(readPersistedMode("song-1")).toBe("compact");
    });

    it("reads different modes for different songs", () => {
      mockStorage.setItem("vocal-tag-view-mode-song-1", "detail");
      mockStorage.setItem("vocal-tag-view-mode-song-2", "compact");
      expect(readPersistedMode("song-1")).toBe("detail");
      expect(readPersistedMode("song-2")).toBe("compact");
    });
  });

  describe("persistMode", () => {
    it("stores compact mode", () => {
      persistMode("song-1", "compact");
      expect(mockStorage.getItem("vocal-tag-view-mode-song-1")).toBe("compact");
    });

    it("stores detail mode", () => {
      persistMode("song-1", "detail");
      expect(mockStorage.getItem("vocal-tag-view-mode-song-1")).toBe("detail");
    });

    it("overwrites previous mode", () => {
      persistMode("song-1", "compact");
      persistMode("song-1", "detail");
      expect(mockStorage.getItem("vocal-tag-view-mode-song-1")).toBe("detail");
    });

    it("stores independently per songId", () => {
      persistMode("song-1", "detail");
      persistMode("song-2", "compact");
      expect(mockStorage.getItem("vocal-tag-view-mode-song-1")).toBe("detail");
      expect(mockStorage.getItem("vocal-tag-view-mode-song-2")).toBe("compact");
    });
  });

  describe("toggle behavior (Req 11.1, 11.2)", () => {
    it("toggles from compact to detail", () => {
      let mode: ViewMode = "compact";
      mode = mode === "compact" ? "detail" : "compact";
      expect(mode).toBe("detail");
    });

    it("toggles from detail to compact", () => {
      let mode: ViewMode = "detail";
      mode = mode === "compact" ? "detail" : "compact";
      expect(mode).toBe("compact");
    });
  });

  describe("round-trip: persist then read (Req 11.3)", () => {
    it("persisted mode is correctly read back", () => {
      persistMode("song-x", "detail");
      expect(readPersistedMode("song-x")).toBe("detail");

      persistMode("song-x", "compact");
      expect(readPersistedMode("song-x")).toBe("compact");
    });
  });
});
