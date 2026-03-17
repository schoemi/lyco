import type { DisplayMode, KaraokeSettings } from "@/types/karaoke";

export const STORAGE_KEYS = {
  displayMode: "karaoke-display-mode",
  scrollSpeed: "karaoke-scroll-speed",
} as const;

const VALID_DISPLAY_MODES: DisplayMode[] = ["einzelzeile", "strophe", "song"];
const DEFAULT_DISPLAY_MODE: DisplayMode = "strophe";
const DEFAULT_SCROLL_SPEED = 3;

export function loadKaraokeSettings(): KaraokeSettings {
  let displayMode: DisplayMode = DEFAULT_DISPLAY_MODE;
  let scrollSpeed: number = DEFAULT_SCROLL_SPEED;

  try {
    const storedMode = localStorage.getItem(STORAGE_KEYS.displayMode);
    if (
      storedMode &&
      VALID_DISPLAY_MODES.includes(storedMode as DisplayMode)
    ) {
      displayMode = storedMode as DisplayMode;
    }
  } catch {
    // localStorage unavailable – use default
  }

  try {
    const storedSpeed = localStorage.getItem(STORAGE_KEYS.scrollSpeed);
    if (storedSpeed !== null) {
      const parsed = Number(storedSpeed);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        scrollSpeed = parsed;
      }
    }
  } catch {
    // localStorage unavailable – use default
  }

  return { displayMode, scrollSpeed };
}

export function saveDisplayMode(mode: DisplayMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.displayMode, mode);
  } catch {
    // localStorage unavailable – silently ignore
  }
}

export function saveScrollSpeed(speed: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.scrollSpeed, String(speed));
  } catch {
    // localStorage unavailable – silently ignore
  }
}
