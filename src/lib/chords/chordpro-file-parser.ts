import type {
  ChordProFileParseResult,
  ChordProFileMetadata,
  ChordProFileSection,
  ChordProFileParseError,
} from "@/types/chord";
import type { ImportSongInput } from "@/types/song";

/**
 * Parst eine vollständige ChordPro-Datei mit Metadaten, Sektionen und Akkorden.
 *
 * Unterstützte Metadaten-Direktiven:
 * - `{title:}` / `{t:}` → metadata.title
 * - `{artist:}` / `{subtitle:}` / `{st:}` → metadata.artist
 * - `{key:}` → metadata.key
 * - `{tempo:}` → metadata.tempo (als Zahl)
 * - `{time:}` → metadata.time (als Zähler/Nenner)
 *
 * Unterstützte Sektions-Direktiven:
 * - `{start_of_verse}` / `{end_of_verse}`
 * - `{start_of_chorus}` / `{end_of_chorus}`
 * - `{start_of_bridge}` / `{end_of_bridge}`
 *
 * Ignorierte Direktiven:
 * - `{define:}`, `{chord:}`, `{start_of_tab}`, `{start_of_grid}`, ABC, Lilypond
 *
 * Akkorde in `[Am]text`-Notation bleiben im Zeilentext erhalten.
 */
export function parseChordProFile(content: string): ChordProFileParseResult {
  const metadata: ChordProFileMetadata = {};
  const sections: ChordProFileSection[] = [];
  const warnings: string[] = [];
  const errors: ChordProFileParseError[] = [];

  const lines = content.split(/\r?\n/);

  let currentSection: ChordProFileSection | null = null;
  let insideIgnoredBlock = false;
  let ignoredBlockType = "";

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines gracefully
    if (trimmed === "") {
      if (currentSection && !insideIgnoredBlock) {
        currentSection.lines.push("");
      }
      continue;
    }

    // Check if this is a directive line (starts with { and ends with })
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const directiveContent = trimmed.slice(1, -1).trim();
      const handled = handleDirective(
        directiveContent,
        lineNumber,
        metadata,
        sections,
        warnings,
        errors,
        currentSection,
        insideIgnoredBlock,
        ignoredBlockType,
      );
      currentSection = handled.currentSection;
      insideIgnoredBlock = handled.insideIgnoredBlock;
      ignoredBlockType = handled.ignoredBlockType;
      continue;
    }

    // Inside an ignored block (tab, grid, etc.) — skip all content
    if (insideIgnoredBlock) {
      continue;
    }

    // Regular content line — preserve chords in [Am]text notation
    if (currentSection) {
      currentSection.lines.push(rawLine);
    } else {
      // Lines outside any section go into an implicit "unknown" section
      currentSection = {
        type: "unknown",
        name: "",
        lines: [rawLine],
      };
      sections.push(currentSection);
    }
  }

  // Trim trailing empty lines from each section
  for (const section of sections) {
    while (
      section.lines.length > 0 &&
      section.lines[section.lines.length - 1] === ""
    ) {
      section.lines.pop();
    }
  }

  return { metadata, sections, warnings, errors };
}

// ---------------------------------------------------------------------------
// Metadata directive names (long and short forms)
// ---------------------------------------------------------------------------

const METADATA_DIRECTIVES: Record<
  string,
  keyof ChordProFileMetadata | "artist_alias"
> = {
  title: "title",
  t: "title",
  artist: "artist",
  subtitle: "artist",
  st: "artist",
  key: "key",
  tempo: "tempo",
  time: "time",
};

// ---------------------------------------------------------------------------
// Section start/end mapping
// ---------------------------------------------------------------------------

type SectionKind = "verse" | "chorus" | "bridge";

const SECTION_START_MAP: Record<string, SectionKind> = {
  start_of_verse: "verse",
  sov: "verse",
  start_of_chorus: "chorus",
  soc: "chorus",
  start_of_bridge: "bridge",
  sob: "bridge",
};

const SECTION_END_MAP: Record<string, SectionKind> = {
  end_of_verse: "verse",
  eov: "verse",
  end_of_chorus: "chorus",
  eoc: "chorus",
  end_of_bridge: "bridge",
  eob: "bridge",
};

// ---------------------------------------------------------------------------
// Ignored directives and blocks
// ---------------------------------------------------------------------------

const IGNORED_SINGLE_DIRECTIVES = new Set([
  "define",
  "chord",
]);

const IGNORED_BLOCK_START: Record<string, string> = {
  start_of_tab: "tab",
  sot: "tab",
  start_of_grid: "grid",
  sog: "grid",
  start_of_abc: "abc",
  start_of_ly: "ly",
};

const IGNORED_BLOCK_END = new Set([
  "end_of_tab",
  "eot",
  "end_of_grid",
  "eog",
  "end_of_abc",
  "end_of_ly",
]);

// ---------------------------------------------------------------------------
// Directive handler
// ---------------------------------------------------------------------------

interface DirectiveState {
  currentSection: ChordProFileSection | null;
  insideIgnoredBlock: boolean;
  ignoredBlockType: string;
}

function handleDirective(
  directiveContent: string,
  lineNumber: number,
  metadata: ChordProFileMetadata,
  sections: ChordProFileSection[],
  warnings: string[],
  errors: ChordProFileParseError[],
  currentSection: ChordProFileSection | null,
  insideIgnoredBlock: boolean,
  ignoredBlockType: string,
): DirectiveState {
  // Parse directive name and optional value
  const colonIndex = directiveContent.indexOf(":");
  let directiveName: string;
  let directiveValue: string;

  if (colonIndex !== -1) {
    directiveName = directiveContent.slice(0, colonIndex).trim().toLowerCase();
    directiveValue = directiveContent.slice(colonIndex + 1).trim();
  } else {
    directiveName = directiveContent.trim().toLowerCase();
    directiveValue = "";
  }

  // --- Handle end of ignored block ---
  if (insideIgnoredBlock) {
    if (IGNORED_BLOCK_END.has(directiveName)) {
      return {
        currentSection,
        insideIgnoredBlock: false,
        ignoredBlockType: "",
      };
    }
    // Still inside ignored block — skip
    return { currentSection, insideIgnoredBlock, ignoredBlockType };
  }

  // --- Handle start of ignored block ---
  if (directiveName in IGNORED_BLOCK_START) {
    return {
      currentSection,
      insideIgnoredBlock: true,
      ignoredBlockType: IGNORED_BLOCK_START[directiveName],
    };
  }

  // --- Handle single ignored directives ---
  if (IGNORED_SINGLE_DIRECTIVES.has(directiveName)) {
    return { currentSection, insideIgnoredBlock, ignoredBlockType };
  }

  // --- Handle metadata directives ---
  if (directiveName in METADATA_DIRECTIVES) {
    handleMetadataDirective(
      directiveName,
      directiveValue,
      lineNumber,
      metadata,
      warnings,
    );
    return { currentSection, insideIgnoredBlock, ignoredBlockType };
  }

  // --- Handle section start ---
  if (directiveName in SECTION_START_MAP) {
    const sectionType = SECTION_START_MAP[directiveName];
    const newSection: ChordProFileSection = {
      type: sectionType,
      name: directiveValue || sectionType,
      lines: [],
    };
    sections.push(newSection);
    return {
      currentSection: newSection,
      insideIgnoredBlock,
      ignoredBlockType,
    };
  }

  // --- Handle section end ---
  if (directiveName in SECTION_END_MAP) {
    // Close the current section
    return {
      currentSection: null,
      insideIgnoredBlock,
      ignoredBlockType,
    };
  }

  // --- Handle end of ignored block directives that appear outside a block ---
  if (IGNORED_BLOCK_END.has(directiveName)) {
    return { currentSection, insideIgnoredBlock, ignoredBlockType };
  }

  // --- Unknown directive — silently ignore ---
  return { currentSection, insideIgnoredBlock, ignoredBlockType };
}

// ---------------------------------------------------------------------------
// Metadata value handlers
// ---------------------------------------------------------------------------

function handleMetadataDirective(
  directiveName: string,
  value: string,
  lineNumber: number,
  metadata: ChordProFileMetadata,
  warnings: string[],
): void {
  const metaKey = METADATA_DIRECTIVES[directiveName];

  switch (metaKey) {
    case "title":
      metadata.title = value;
      break;

    case "artist":
    case "artist_alias":
      metadata.artist = value;
      break;

    case "key":
      metadata.key = value;
      break;

    case "tempo": {
      const tempoNum = Number(value);
      if (isNaN(tempoNum) || tempoNum <= 0) {
        warnings.push(
          `Zeile ${lineNumber}: Ungültiges Tempo "${value}" — wird ignoriert`,
        );
      } else {
        metadata.tempo = tempoNum;
      }
      break;
    }

    case "time": {
      const timeMatch = value.match(/^(\d+)\/(\d+)$/);
      if (!timeMatch) {
        warnings.push(
          `Zeile ${lineNumber}: Ungültige Taktart "${value}" — wird ignoriert`,
        );
      } else {
        const zaehler = Number(timeMatch[1]);
        const nenner = Number(timeMatch[2]);
        if (zaehler <= 0 || nenner <= 0) {
          warnings.push(
            `Zeile ${lineNumber}: Ungültige Taktart "${value}" — wird ignoriert`,
          );
        } else {
          metadata.time = { zaehler, nenner };
        }
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Conversion: ChordProFileParseResult → ImportSongInput
// ---------------------------------------------------------------------------

/**
 * Konvertiert ein ChordPro-Parse-Ergebnis in ein `ImportSongInput`-Objekt,
 * das direkt an `importSong()` übergeben werden kann.
 *
 * Mapping:
 * - `metadata.title` → `titel` (Fallback: "Untitled")
 * - `metadata.artist` → `kuenstler`
 * - `metadata.key` → `tonart`
 * - `metadata.tempo` → `bpm`
 * - `metadata.time.zaehler` → `taktZaehler`
 * - `metadata.time.nenner` → `taktNenner`
 * - Jede Sektion → `ImportStropheInput` mit `name` und `zeilen`
 * - Jede Zeile in einer Sektion → `ImportZeileInput` mit `text` (Akkorde erhalten)
 */
export function chordProToImportInput(
  result: ChordProFileParseResult,
): ImportSongInput {
  return {
    titel: result.metadata.title ?? "Untitled",
    kuenstler: result.metadata.artist,
    tonart: result.metadata.key,
    bpm: result.metadata.tempo,
    taktZaehler: result.metadata.time?.zaehler,
    taktNenner: result.metadata.time?.nenner,
    strophen: result.sections.map((section) => ({
      name: section.name,
      zeilen: section.lines.map((line) => ({
        text: line,
      })),
    })),
  };
}
