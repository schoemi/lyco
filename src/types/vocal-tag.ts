// --- Tag-Definition-Typen ---

export interface TagDefinitionData {
  id: string;
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
}

export interface CreateTagDefinitionInput {
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
}

export interface UpdateTagDefinitionInput {
  label?: string;
  icon?: string;
  color?: string;
  indexNr?: number;
}

// --- ChordPro-Typen ---

export interface ChordProTag {
  tag: string;
  zusatztext: string;
  unknown?: boolean;
}

export interface ChordProParseResult {
  nodes: ChordProNode[];
  warnings: string[];
  errors: ChordProParseError[];
}

export interface ChordProNode {
  type: 'text' | 'chordpro-tag' | 'chordpro-range';
  content?: string;
  tag?: string;
  zusatztext?: string;
  unknown?: boolean;
  /** For range tags: the marked text content */
  rangeText?: string;
}

export interface ChordProParseError {
  message: string;
  position: number;
  line?: number;
}
