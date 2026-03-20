/**
 * Backup-Typen für Song/Set Export & Import
 *
 * Definiert alle TypeScript-Interfaces für das versionierte
 * ZIP-basierte Backup-Format.
 */

/** Aktuelle Export-Format-Version */
export const CURRENT_EXPORT_VERSION = "1.0";

// ---------------------------------------------------------------------------
// Song-Manifest (song.json)
// ---------------------------------------------------------------------------

export interface SongManifest {
  exportVersion: string;
  originalId: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  coverUrl: string | null;
  analyse: string | null;
  coachTipp: string | null;
  strophen: StropheManifest[];
  audioQuellen: AudioQuelleManifest[];
}

export interface StropheManifest {
  originalId: string;
  name: string;
  orderIndex: number;
  analyse: string | null;
  interpretation: string | null;
  notiz: string | null;
  zeilen: ZeileManifest[];
  markups: MarkupManifest[];
}

export interface ZeileManifest {
  originalId: string;
  text: string;
  uebersetzung: string | null;
  orderIndex: number;
  markups: MarkupManifest[];
}

export interface MarkupManifest {
  typ: string;
  ziel: string;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
}

export interface AudioQuelleManifest {
  url: string;
  typ: string;
  label: string;
  orderIndex: number;
  rolle: string;
}

// ---------------------------------------------------------------------------
// Set-Manifest (set.json)
// ---------------------------------------------------------------------------

export interface SetManifest {
  exportVersion: string;
  name: string;
  description: string | null;
  songs: SetSongEntry[];
}

export interface SetSongEntry {
  folder: string;
  orderIndex: number;
}

// ---------------------------------------------------------------------------
// Import-Typen
// ---------------------------------------------------------------------------

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  isSet: boolean;
  songs: ImportSongPreview[];
  set?: { name: string; description: string | null };
  conflicts: ImportConflict[];
}

export interface ImportSongPreview {
  originalId: string;
  titel: string;
  kuenstler: string | null;
  strophenCount: number;
}

export interface ImportConflict {
  originalId: string;
  titel: string;
  existingTitle: string;
}

export interface ImportResult {
  imported: number;
  message: string;
}
