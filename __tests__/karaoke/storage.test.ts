/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  STORAGE_KEYS,
  loadKaraokeSettings,
  saveDisplayMode,
  saveScrollSpeed,
} from "@/lib/karaoke/storage";

/**
 * Create an in-memory localStorage mock compatible with Node 25+
 * where the built-in localStorage lacks .clear().
 */
function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("karaoke storage helpers", () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorageMock(),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe("STORAGE_KEYS", () => {
    it("has the expected key values", () => {
      expect(STORAGE_KEYS.displayMode).toBe("karaoke-display-mode");
      expect(STORAGE_KEYS.scrollSpeed).toBe("karaoke-scroll-speed");
    });
  });

  describe("loadKaraokeSettings", () => {
    it("returns defaults when localStorage is empty", () => {
      const settings = loadKaraokeSettings();
      expect(settings.displayMode).toBe("strophe");
      expect(settings.scrollSpeed).toBe(3);
    });

    it("loads a valid displayMode from localStorage", () => {
      localStorage.setItem(STORAGE_KEYS.displayMode, "einzelzeile");
      const settings = loadKaraokeSettings();
      expect(settings.displayMode).toBe("einzelzeile");
    });

    it("loads a valid scrollSpeed from localStorage", () => {
      localStorage.setItem(STORAGE_KEYS.scrollSpeed, "7");
      const settings = loadKaraokeSettings();
      expect(settings.scrollSpeed).toBe(7);
    });

    it("falls back to default for invalid displayMode", () => {
      localStorage.setItem(STORAGE_KEYS.displayMode, "invalid");
      const settings = loadKaraokeSettings();
      expect(settings.displayMode).toBe("strophe");
    });

    it("falls back to default for scrollSpeed out of range (too low)", () => {
      localStorage.setItem(STORAGE_KEYS.scrollSpeed, "0");
      const settings = loadKaraokeSettings();
      expect(settings.scrollSpeed).toBe(3);
    });

    it("falls back to default for scrollSpeed out of range (too high)", () => {
      localStorage.setItem(STORAGE_KEYS.scrollSpeed, "11");
      const settings = loadKaraokeSettings();
      expect(settings.scrollSpeed).toBe(3);
    });

    it("falls back to default for non-numeric scrollSpeed", () => {
      localStorage.setItem(STORAGE_KEYS.scrollSpeed, "abc");
      const settings = loadKaraokeSettings();
      expect(settings.scrollSpeed).toBe(3);
    });

    it("handles localStorage throwing errors gracefully", () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: {
          ...createStorageMock(),
          getItem() {
            throw new Error("SecurityError");
          },
        },
        writable: true,
        configurable: true,
      });
      const settings = loadKaraokeSettings();
      expect(settings.displayMode).toBe("strophe");
      expect(settings.scrollSpeed).toBe(3);
    });
  });

  describe("saveDisplayMode", () => {
    it("saves the display mode to localStorage", () => {
      saveDisplayMode("song");
      expect(localStorage.getItem(STORAGE_KEYS.displayMode)).toBe("song");
    });

    it("handles localStorage throwing errors gracefully", () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: {
          ...createStorageMock(),
          setItem() {
            throw new Error("QuotaExceededError");
          },
        },
        writable: true,
        configurable: true,
      });
      expect(() => saveDisplayMode("song")).not.toThrow();
    });
  });

  describe("saveScrollSpeed", () => {
    it("saves the scroll speed to localStorage", () => {
      saveScrollSpeed(5);
      expect(localStorage.getItem(STORAGE_KEYS.scrollSpeed)).toBe("5");
    });

    it("handles localStorage throwing errors gracefully", () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: {
          ...createStorageMock(),
          setItem() {
            throw new Error("QuotaExceededError");
          },
        },
        writable: true,
        configurable: true,
      });
      expect(() => saveScrollSpeed(5)).not.toThrow();
    });
  });
});
