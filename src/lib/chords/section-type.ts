/**
 * Mapping von bekannten Schlüsselwörtern auf ChordPro-Sektionstypen.
 *
 * Der Strophe-Name wird in Kleinbuchstaben konvertiert und gegen diese
 * Schlüsselwörter geprüft (z.B. "Verse 1" → `verse`, "Chorus" → `chorus`).
 */
const SECTION_TYPE_MAP: Record<string, 'verse' | 'chorus' | 'bridge'> = {
  verse: 'verse',
  chorus: 'chorus',
  refrain: 'chorus',
  bridge: 'bridge',
};

/**
 * Ermittelt den ChordPro-Sektionstyp aus einem Strophe-Namen.
 *
 * Heuristik: Der Name wird in Kleinbuchstaben konvertiert und gegen bekannte
 * Schlüsselwörter geprüft. Unbekannte Namen werden als `'verse'` behandelt,
 * da `{start_of_verse}` der allgemeinste Sektionstyp ist.
 *
 * Beispiele:
 * - "Verse 1" → 'verse'
 * - "Chorus" → 'chorus'
 * - "Refrain" → 'chorus'
 * - "Bridge" → 'bridge'
 * - "Intro" → 'verse' (unbekannt → Fallback)
 */
export function getSectionType(
  stropheName: string,
): 'verse' | 'chorus' | 'bridge' | 'unknown' {
  const lower = stropheName.toLowerCase();

  for (const keyword of Object.keys(SECTION_TYPE_MAP)) {
    if (lower.includes(keyword)) {
      return SECTION_TYPE_MAP[keyword];
    }
  }

  return 'verse';
}
