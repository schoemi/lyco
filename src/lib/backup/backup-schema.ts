/**
 * Schema-Validierung für Song/Set Backup-Manifeste
 *
 * Validiert Pflichtfelder, Enum-Werte, Export-Version
 * und Referenz-Integrität importierter Manifeste.
 */

import type {
  SongManifest,
  StropheManifest,
  MarkupManifest,
  AudioQuelleManifest,
} from "./backup-types";
import { CURRENT_EXPORT_VERSION } from "./backup-types";

// ---------------------------------------------------------------------------
// Erlaubte Enum-Werte (aus Prisma-Schema)
// ---------------------------------------------------------------------------

const VALID_MARKUP_TYP = new Set([
  "PAUSE",
  "WIEDERHOLUNG",
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "TIMECODE",
]);

const VALID_MARKUP_ZIEL = new Set(["STROPHE", "ZEILE", "WORT"]);

const VALID_AUDIO_TYP = new Set(["MP3", "SPOTIFY", "YOUTUBE", "APPLE_MUSIC"]);

const VALID_AUDIO_ROLLE = new Set(["STANDARD", "INSTRUMENTAL", "REFERENZ_VOKAL"]);

/** Unterstützte Export-Versionen */
const SUPPORTED_EXPORT_VERSIONS = new Set([CURRENT_EXPORT_VERSION]);

// ---------------------------------------------------------------------------
// Validierungsergebnis
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

// ---------------------------------------------------------------------------
// Markup-Validierung
// ---------------------------------------------------------------------------

function validateMarkup(
  markup: MarkupManifest,
  path: string,
): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(markup.typ)) {
    errors.push(`${path}.typ ist erforderlich`);
  } else if (!VALID_MARKUP_TYP.has(markup.typ)) {
    errors.push(
      `${path}.typ: ungültiger Wert "${markup.typ}". Erlaubt: ${Array.from(VALID_MARKUP_TYP).join(", ")}`,
    );
  }

  if (!isNonEmptyString(markup.ziel)) {
    errors.push(`${path}.ziel ist erforderlich`);
  } else if (!VALID_MARKUP_ZIEL.has(markup.ziel)) {
    errors.push(
      `${path}.ziel: ungültiger Wert "${markup.ziel}". Erlaubt: ${Array.from(VALID_MARKUP_ZIEL).join(", ")}`,
    );
  }

  if (!isStringOrNull(markup.wert)) {
    errors.push(`${path}.wert muss ein String oder null sein`);
  }
  if (!isNumberOrNull(markup.timecodeMs)) {
    errors.push(`${path}.timecodeMs muss eine Zahl oder null sein`);
  }
  if (!isNumberOrNull(markup.wortIndex)) {
    errors.push(`${path}.wortIndex muss eine Zahl oder null sein`);
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ---------------------------------------------------------------------------
// AudioQuelle-Validierung
// ---------------------------------------------------------------------------

function validateAudioQuelle(
  aq: AudioQuelleManifest,
  path: string,
): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(aq.url)) {
    errors.push(`${path}.url ist erforderlich`);
  }
  if (!isNonEmptyString(aq.label)) {
    errors.push(`${path}.label ist erforderlich`);
  }

  if (!isNonEmptyString(aq.typ)) {
    errors.push(`${path}.typ ist erforderlich`);
  } else if (!VALID_AUDIO_TYP.has(aq.typ)) {
    errors.push(
      `${path}.typ: ungültiger Wert "${aq.typ}". Erlaubt: ${Array.from(VALID_AUDIO_TYP).join(", ")}`,
    );
  }

  if (!isNonEmptyString(aq.rolle)) {
    errors.push(`${path}.rolle ist erforderlich`);
  } else if (!VALID_AUDIO_ROLLE.has(aq.rolle)) {
    errors.push(
      `${path}.rolle: ungültiger Wert "${aq.rolle}". Erlaubt: ${Array.from(VALID_AUDIO_ROLLE).join(", ")}`,
    );
  }

  if (typeof aq.orderIndex !== "number") {
    errors.push(`${path}.orderIndex muss eine Zahl sein`);
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ---------------------------------------------------------------------------
// Song-Manifest-Validierung
// ---------------------------------------------------------------------------

export function validateSongManifest(manifest: unknown): ValidationResult {
  if (!manifest || typeof manifest !== "object") {
    return fail("Song-Manifest muss ein Objekt sein");
  }

  const m = manifest as Record<string, unknown>;
  const errors: string[] = [];

  // --- exportVersion ---
  if (!isNonEmptyString(m.exportVersion)) {
    errors.push("exportVersion ist erforderlich");
  } else if (!SUPPORTED_EXPORT_VERSIONS.has(m.exportVersion)) {
    return fail(
      `Export-Version "${m.exportVersion}" wird nicht unterstützt. Unterstützt: ${Array.from(SUPPORTED_EXPORT_VERSIONS).join(", ")}`,
    );
  }

  // --- Pflichtfelder ---
  if (!isNonEmptyString(m.titel)) {
    errors.push("titel ist erforderlich");
  }
  if (!isNonEmptyString(m.originalId)) {
    errors.push("originalId ist erforderlich");
  }

  // --- Optionale String-Felder ---
  if (!isStringOrNull(m.kuenstler)) {
    errors.push("kuenstler muss ein String oder null sein");
  }
  if (!isStringOrNull(m.sprache)) {
    errors.push("sprache muss ein String oder null sein");
  }
  if (!isStringOrNull(m.coverUrl)) {
    errors.push("coverUrl muss ein String oder null sein");
  }
  if (!isStringOrNull(m.analyse)) {
    errors.push("analyse muss ein String oder null sein");
  }
  if (!isStringOrNull(m.coachTipp)) {
    errors.push("coachTipp muss ein String oder null sein");
  }

  // --- emotionsTags ---
  if (!Array.isArray(m.emotionsTags)) {
    errors.push("emotionsTags muss ein Array sein");
  }

  // --- strophen (Pflicht) ---
  if (!Array.isArray(m.strophen)) {
    errors.push("strophen ist erforderlich und muss ein Array sein");
    return fail(...errors);
  }

  // Strophen-IDs sammeln für Referenz-Integrität
  const strophenIds = new Set<string>();
  const strophen = m.strophen as StropheManifest[];

  for (const s of strophen) {
    if (isNonEmptyString(s.originalId)) {
      strophenIds.add(s.originalId);
    }
  }

  // Strophen validieren
  for (let si = 0; si < strophen.length; si++) {
    const s = strophen[si];
    const sp = `strophen[${si}]`;

    if (!isNonEmptyString(s.originalId)) {
      errors.push(`${sp}.originalId ist erforderlich`);
    }
    if (!isNonEmptyString(s.name)) {
      errors.push(`${sp}.name ist erforderlich`);
    }
    if (typeof s.orderIndex !== "number") {
      errors.push(`${sp}.orderIndex muss eine Zahl sein`);
    }
    if (!isStringOrNull(s.analyse)) {
      errors.push(`${sp}.analyse muss ein String oder null sein`);
    }
    if (!isStringOrNull(s.interpretation)) {
      errors.push(`${sp}.interpretation muss ein String oder null sein`);
    }
    if (!isStringOrNull(s.notiz)) {
      errors.push(`${sp}.notiz muss ein String oder null sein`);
    }

    // Strophen-Level Markups
    if (Array.isArray(s.markups)) {
      for (let mi = 0; mi < s.markups.length; mi++) {
        const mr = validateMarkup(s.markups[mi], `${sp}.markups[${mi}]`);
        errors.push(...mr.errors);
      }
    }

    // Zeilen
    if (!Array.isArray(s.zeilen)) {
      errors.push(`${sp}.zeilen muss ein Array sein`);
    } else {
      for (let zi = 0; zi < s.zeilen.length; zi++) {
        const z = s.zeilen[zi];
        const zp = `${sp}.zeilen[${zi}]`;

        if (!isNonEmptyString(z.originalId)) {
          errors.push(`${zp}.originalId ist erforderlich`);
        }
        if (typeof z.text !== "string") {
          errors.push(`${zp}.text ist erforderlich`);
        }
        if (!isStringOrNull(z.uebersetzung)) {
          errors.push(`${zp}.uebersetzung muss ein String oder null sein`);
        }
        if (typeof z.orderIndex !== "number") {
          errors.push(`${zp}.orderIndex muss eine Zahl sein`);
        }

        // Zeilen-Level Markups
        if (Array.isArray(z.markups)) {
          for (let mi = 0; mi < z.markups.length; mi++) {
            const mr = validateMarkup(z.markups[mi], `${zp}.markups[${mi}]`);
            errors.push(...mr.errors);
          }
        }
      }
    }
  }

  // --- audioQuellen ---
  if (Array.isArray(m.audioQuellen)) {
    const audioQuellen = m.audioQuellen as AudioQuelleManifest[];
    for (let ai = 0; ai < audioQuellen.length; ai++) {
      const ar = validateAudioQuelle(
        audioQuellen[ai],
        `audioQuellen[${ai}]`,
      );
      errors.push(...ar.errors);
    }
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ---------------------------------------------------------------------------
// Referenz-Integrität: Strophen-Referenzen in Markups prüfen
// ---------------------------------------------------------------------------

/**
 * Prüft, dass alle Strophen-Level-Markups (ziel=STROPHE) auf tatsächlich
 * vorhandene Strophen verweisen. Zeilen-Level-Markups werden ebenfalls
 * geprüft — sie müssen innerhalb einer existierenden Strophe liegen.
 *
 * Diese Funktion wird separat aufgerufen, da sie auf ein bereits
 * strukturell valides Manifest angewiesen ist.
 */
export function validateReferenceIntegrity(
  manifest: SongManifest,
): ValidationResult {
  const errors: string[] = [];

  // Prüfe auf doppelte IDs innerhalb des Manifests
  const seenStrophenIds = new Set<string>();
  for (let si = 0; si < manifest.strophen.length; si++) {
    const s = manifest.strophen[si];
    if (seenStrophenIds.has(s.originalId)) {
      errors.push(
        `Doppelte Strophen-ID "${s.originalId}" in strophen[${si}]`,
      );
    }
    seenStrophenIds.add(s.originalId);

    const seenZeilenIds = new Set<string>();
    for (let zi = 0; zi < s.zeilen.length; zi++) {
      const z = s.zeilen[zi];
      if (seenZeilenIds.has(z.originalId)) {
        errors.push(
          `Doppelte Zeilen-ID "${z.originalId}" in strophen[${si}].zeilen[${zi}]`,
        );
      }
      seenZeilenIds.add(z.originalId);
    }
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ---------------------------------------------------------------------------
// Set-Manifest-Validierung
// ---------------------------------------------------------------------------

export function validateSetManifest(manifest: unknown): ValidationResult {
  if (!manifest || typeof manifest !== "object") {
    return fail("Set-Manifest muss ein Objekt sein");
  }

  const m = manifest as Record<string, unknown>;
  const errors: string[] = [];

  // --- exportVersion ---
  if (!isNonEmptyString(m.exportVersion)) {
    errors.push("exportVersion ist erforderlich");
  } else if (!SUPPORTED_EXPORT_VERSIONS.has(m.exportVersion)) {
    return fail(
      `Export-Version "${m.exportVersion}" wird nicht unterstützt. Unterstützt: ${Array.from(SUPPORTED_EXPORT_VERSIONS).join(", ")}`,
    );
  }

  // --- Pflichtfelder ---
  if (!isNonEmptyString(m.name)) {
    errors.push("name ist erforderlich");
  }

  if (!isStringOrNull(m.description)) {
    errors.push("description muss ein String oder null sein");
  }

  // --- songs ---
  if (!Array.isArray(m.songs)) {
    errors.push("songs ist erforderlich und muss ein Array sein");
  } else {
    const songs = m.songs as Array<Record<string, unknown>>;
    for (let i = 0; i < songs.length; i++) {
      const s = songs[i];
      const sp = `songs[${i}]`;

      if (!isNonEmptyString(s.folder)) {
        errors.push(`${sp}.folder ist erforderlich`);
      }
      if (typeof s.orderIndex !== "number") {
        errors.push(`${sp}.orderIndex muss eine Zahl sein`);
      }
    }
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ---------------------------------------------------------------------------
// Kombinierte Validierung (Convenience)
// ---------------------------------------------------------------------------

/**
 * Vollständige Validierung eines Song-Manifests:
 * Schema-Validierung + Referenz-Integrität.
 */
export function validateSongManifestFull(manifest: unknown): ValidationResult {
  const schemaResult = validateSongManifest(manifest);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  const refResult = validateReferenceIntegrity(manifest as SongManifest);
  return merge(schemaResult, refResult);
}
