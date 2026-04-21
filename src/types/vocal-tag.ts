// --- Tag-Kategorie-Typen ---

export interface TagKategorieData {
  id: string;
  title: string;
  slug: string;
  orderIndex: number;
  _count?: { tagDefinitions: number };
}

export interface CreateTagKategorieInput {
  title: string;
  slug: string;
  orderIndex?: number;
}

export interface UpdateTagKategorieInput {
  title?: string;
  slug?: string;
  orderIndex?: number;
}

// --- Tag-Definition-Typen ---

export interface TagDefinitionData {
  id: string;
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
  categoryId: string | null;
  category?: TagKategorieData;
}

export interface CreateTagDefinitionInput {
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
  categoryId?: string | null;
}

export interface UpdateTagDefinitionInput {
  label?: string;
  icon?: string;
  color?: string;
  indexNr?: number;
  categoryId?: string | null;
}

// --- Import-Format ---

export interface TagConfigImportItem {
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
  category?: string;
}

// --- Gruppierte Tag-Struktur für UI ---

export interface GruppierteTagDefinitionen {
  kategorie: TagKategorieData | null;
  tags: TagDefinitionData[];
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
