/** Die vier Darstellungsmodi */
export type DisplayMode = "einzelzeile" | "strophe" | "song" | "keinText";

/** Flache Zeile mit Kontext-Informationen für die Karaoke-Ansicht */
export interface FlatLine {
  zeileId: string;
  text: string;
  /** Original-Text mit ChordPro-Tags (für Vocal-Tag-Rendering) */
  rawText: string;
  stropheId: string;
  stropheName: string;
  globalIndex: number;
  indexInStrophe: number;
  stropheLineCount: number;
}

/** Konfiguration des Hintergrund-Gradienten */
export interface GradientConfig {
  startColor: string;
  endColor: string;
  direction: string;
}

/** Persistierte Karaoke-Einstellungen */
export interface KaraokeSettings {
  displayMode: DisplayMode;
  scrollSpeed: number; // 1–10 Sekunden
}
