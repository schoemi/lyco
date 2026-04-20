/**
 * Dateinamen-Generator für Song-Export
 *
 * Generiert sichere Dateinamen nach dem Muster:
 * "{Titel} - {Künstler}.{ext}" oder "{Titel}.{ext}" wenn kein Künstler.
 * Entfernt ungültige Dateisystem-Zeichen.
 *
 * Reine Funktion ohne Seiteneffekte.
 */

/**
 * Regex für ungültige Dateisystem-Zeichen: / \ : * ? " < > |
 */
const INVALID_CHARS = /[/\\:*?"<>|]/g;

/**
 * Entfernt ungültige Dateisystem-Zeichen aus einem String.
 */
function sanitize(value: string): string {
  return value.replace(INVALID_CHARS, "");
}

/**
 * Generiert einen sicheren Export-Dateinamen.
 *
 * - Muster mit Künstler: `"{Titel} - {Künstler}.{ext}"`
 * - Muster ohne Künstler: `"{Titel}.{ext}"`
 * - Ungültige Dateisystem-Zeichen (/ \ : * ? " < > |) werden entfernt
 *
 * @param titel - Der Song-Titel
 * @param kuenstler - Der Künstler-Name (null oder leer → wird weggelassen)
 * @param extension - Die Dateiendung ohne Punkt (z.B. "pdf", "cho")
 * @returns Der generierte Dateiname
 */
export function generateExportFilename(
  titel: string,
  kuenstler: string | null,
  extension: string,
): string {
  const safeTitel = sanitize(titel);
  const safeExtension = sanitize(extension);

  if (kuenstler != null && kuenstler.trim() !== "") {
    const safeKuenstler = sanitize(kuenstler);
    return `${safeTitel} - ${safeKuenstler}.${safeExtension}`;
  }

  return `${safeTitel}.${safeExtension}`;
}
