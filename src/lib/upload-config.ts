/**
 * Zentrale Upload-Konfiguration
 *
 * Alle Upload-Größenlimits und ZIP-Sicherheitskonstanten an einer Stelle.
 * Route-Dateien importieren diese Werte statt eigene Konstanten zu definieren.
 */

/** Upload-Größenlimits in Bytes pro Dateityp */
export const UPLOAD_LIMITS = {
  /** Backup-ZIP-Dateien (Import/Export) */
  BACKUP_IMPORT: 100 * 1024 * 1024, // 100 MB
  /** Audio-Dateien (MP3/MP4) */
  AUDIO: 50 * 1024 * 1024, // 50 MB
  /** PDF-Dateien */
  PDF: 5 * 1024 * 1024, // 5 MB
  /** Cover-Bilder (JPEG/PNG/WebP) */
  COVER: 5 * 1024 * 1024, // 5 MB
  /** Standard-Fallback */
  DEFAULT: 10 * 1024 * 1024, // 10 MB
} as const;

/** ZIP-Sicherheitslimits für Bomb-Schutz */
export const ZIP_LIMITS = {
  /** Maximale entpackte Gesamtgröße in Bytes */
  MAX_UNCOMPRESSED_SIZE: 500 * 1024 * 1024, // 500 MB
  /** Maximale Anzahl an Einträgen im Archiv */
  MAX_ENTRY_COUNT: 1_000,
} as const;

/** Die ersten 4 Bytes einer gültigen ZIP-Datei: PK\x03\x04 */
export const ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
