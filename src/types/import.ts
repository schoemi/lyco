export type ImportMode = "manuell" | "text" | "pdf";

export interface ParsedSong {
  strophen: ParsedStrophe[];
}

export interface ParsedStrophe {
  name: string;
  zeilen: string[];
}

export interface PdfParseResult {
  titel: string;
  kuenstler: string;
  text: string; // Songtext im [Section]-Format
}
