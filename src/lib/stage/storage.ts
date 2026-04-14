import type { DisplayMode } from "@/types/karaoke";
import {
  DEFAULT_STAGE_SETTINGS,
  VALID_FONT_SIZES,
  type StageSettings,
} from "@/types/stage";

export const STAGE_STORAGE_KEYS = {
  displayMode: "stage-display-mode",
  scrollSpeed: "stage-scroll-speed",
  fontSize: "stage-font-size",
  highlightingEnabled: "stage-highlighting-enabled",
  highlightThresholdLow: "stage-highlight-threshold-low",
  highlightThresholdHigh: "stage-highlight-threshold-high",
  lastSync: "stage-last-sync",
} as const;

const VALID_DISPLAY_MODES: DisplayMode[] = ["einzelzeile", "strophe", "song"];

export function loadStageSettings(): StageSettings {
  const settings: StageSettings = { ...DEFAULT_STAGE_SETTINGS };

  try {
    const storedMode = localStorage.getItem(STAGE_STORAGE_KEYS.displayMode);
    if (storedMode && VALID_DISPLAY_MODES.includes(storedMode as DisplayMode)) {
      settings.displayMode = storedMode as DisplayMode;
    }
  } catch {
    // localStorage unavailable – use default
  }

  try {
    const storedSpeed = localStorage.getItem(STAGE_STORAGE_KEYS.scrollSpeed);
    if (storedSpeed !== null) {
      const parsed = Number(storedSpeed);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        settings.scrollSpeed = parsed;
      }
    }
  } catch {
    // localStorage unavailable – use default
  }

  try {
    const storedSize = localStorage.getItem(STAGE_STORAGE_KEYS.fontSize);
    if (storedSize !== null) {
      const parsed = Number(storedSize);
      if (VALID_FONT_SIZES.includes(parsed as (typeof VALID_FONT_SIZES)[number])) {
        settings.fontSize = parsed;
      }
    }
  } catch {
    // localStorage unavailable – use default
  }

  try {
    const storedHighlighting = localStorage.getItem(
      STAGE_STORAGE_KEYS.highlightingEnabled,
    );
    if (storedHighlighting !== null) {
      settings.highlightingEnabled = storedHighlighting === "true";
    }
  } catch {
    // localStorage unavailable – use default
  }

  try {
    const storedLow = localStorage.getItem(
      STAGE_STORAGE_KEYS.highlightThresholdLow,
    );
    if (storedLow !== null) {
      const parsed = Number(storedLow);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        settings.highlightThresholdLow = parsed;
      }
    }
  } catch {
    // localStorage unavailable – use default
  }

  try {
    const storedHigh = localStorage.getItem(
      STAGE_STORAGE_KEYS.highlightThresholdHigh,
    );
    if (storedHigh !== null) {
      const parsed = Number(storedHigh);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        settings.highlightThresholdHigh = parsed;
      }
    }
  } catch {
    // localStorage unavailable – use default
  }

  return settings;
}

export function saveStageSettings(settings: StageSettings): void {
  try {
    localStorage.setItem(STAGE_STORAGE_KEYS.displayMode, settings.displayMode);
    localStorage.setItem(
      STAGE_STORAGE_KEYS.scrollSpeed,
      String(settings.scrollSpeed),
    );
    localStorage.setItem(
      STAGE_STORAGE_KEYS.fontSize,
      String(settings.fontSize),
    );
    localStorage.setItem(
      STAGE_STORAGE_KEYS.highlightingEnabled,
      String(settings.highlightingEnabled),
    );
    localStorage.setItem(
      STAGE_STORAGE_KEYS.highlightThresholdLow,
      String(settings.highlightThresholdLow),
    );
    localStorage.setItem(
      STAGE_STORAGE_KEYS.highlightThresholdHigh,
      String(settings.highlightThresholdHigh),
    );
  } catch {
    // localStorage unavailable – silently ignore
  }
}

export function loadLastSyncTimestamp(): string | null {
  try {
    return localStorage.getItem(STAGE_STORAGE_KEYS.lastSync);
  } catch {
    return null;
  }
}

export function saveLastSyncTimestamp(timestamp: string): void {
  try {
    localStorage.setItem(STAGE_STORAGE_KEYS.lastSync, timestamp);
  } catch {
    // localStorage unavailable – silently ignore
  }
}
