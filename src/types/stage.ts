import type { DisplayMode } from "@/types/karaoke";

/** Stage-spezifische Einstellungen (in localStorage persistiert) */
export interface StageSettings {
  displayMode: DisplayMode;        // "einzelzeile" | "strophe" | "song"
  scrollSpeed: number;             // 1–10 Sekunden
  fontSize: number;                // 32 | 40 | 48 | 56 | 72 (px)
  highlightingEnabled: boolean;    // Lernfortschritt-Highlighting an/aus
  highlightThresholdLow: number;   // Standard: 50 (%)
  highlightThresholdHigh: number;  // Standard: 80 (%)
}

/** Gültige Schriftgrößen-Stufen für den Stage-Modus */
export const VALID_FONT_SIZES = [32, 40, 48, 56, 72] as const;
export type ValidFontSize = (typeof VALID_FONT_SIZES)[number];

/** Fallback-Werte für Stage-Einstellungen */
export const DEFAULT_STAGE_SETTINGS: StageSettings = {
  displayMode: "strophe",
  scrollSpeed: 3,
  fontSize: 48,
  highlightingEnabled: true,
  highlightThresholdLow: 50,
  highlightThresholdHigh: 80,
};

/** API-Antwort für den Bundle-Endpunkt */
export interface StageBundleResponse {
  sets: StageSet[];
  songs: StageSong[];
  timestamp: string; // ISO-8601
}

/** API-Antwort für den Progress-Endpunkt */
export interface StageProgressResponse {
  progress: StageStropheProgress[];
  timestamp: string; // ISO-8601
}

/** Eine Setlist mit Song-Zuordnungen */
export interface StageSet {
  id: string;
  name: string;
  description: string | null;
  songs: { songId: string; orderIndex: number }[];
}

/** Ein Song mit Strophen und Zeilen */
export interface StageSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  strophen: StageStrophe[];
}

/** Eine Strophe mit Zeilen */
export interface StageStrophe {
  id: string;
  name: string;
  orderIndex: number;
  timecodeMs: number | null; // Timecode-Marke in Millisekunden (optional)
  zeilen: StageZeile[];
}

/** Eine einzelne Textzeile */
export interface StageZeile {
  id: string;
  text: string;
  orderIndex: number;
}

/** Lernfortschritt einer Strophe */
export interface StageStropheProgress {
  stropheId: string;
  prozent: number; // 0–100
}
