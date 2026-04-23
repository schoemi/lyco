export interface ChordPosition {
  /** Akkordname (z.B. "Am", "G", "Cmaj7#11") */
  name: string;
  /** Zeichenposition im reinen Text (0-basiert) */
  position: number;
}

export interface ChordParseResult {
  /** Reiner Text ohne Akkord-Notation */
  plainText: string;
  /** Extrahierte Akkorde mit Positionen */
  chords: ChordPosition[];
}

export interface ChordProFileMetadata {
  title?: string;
  artist?: string;
  key?: string;
  tempo?: number;
  time?: { zaehler: number; nenner: number };
}

export interface ChordProFileSection {
  type: "verse" | "chorus" | "bridge" | "unknown";
  name: string;
  lines: string[];
}

export interface ChordProFileParseResult {
  metadata: ChordProFileMetadata;
  sections: ChordProFileSection[];
  warnings: string[];
  errors: ChordProFileParseError[];
}

export interface ChordProFileParseError {
  message: string;
  line: number;
}
