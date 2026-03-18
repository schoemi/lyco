import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * Pflichtfelder für eine gültige Tag-Definition im Import-JSON.
 */
const REQUIRED_FIELDS = ["tag", "label", "icon", "color", "indexNr"] as const;

/**
 * Ergebnis einer Tag-Konfigurations-Validierung.
 */
export interface TagConfigValidationResult {
  valid: boolean;
  definitions: TagConfigImportItem[];
  errors: string[];
}

/**
 * Ein einzelner Tag-Eintrag aus dem Import-JSON (ohne id).
 */
export interface TagConfigImportItem {
  tag: string;
  label: string;
  icon: string;
  color: string;
  indexNr: number;
}

/**
 * Ergebnis des Duplikat-Checks beim Import.
 */
export interface DuplicateCheckResult {
  newItems: TagConfigImportItem[];
  duplicates: TagConfigImportItem[];
}

/**
 * Serialisiert Tag-Definitionen als JSON-String für den Export.
 * Entfernt die `id`-Felder, da diese instanzspezifisch sind.
 */
export function serializeTagConfig(definitions: TagDefinitionData[]): string {
  const exportData = definitions.map(({ tag, label, icon, color, indexNr }) => ({
    tag,
    label,
    icon,
    color,
    indexNr,
  }));
  return JSON.stringify(exportData, null, 2);
}

/**
 * Löst einen Browser-Download einer JSON-Datei mit Tag-Definitionen aus.
 */
export function downloadTagConfigAsJson(
  definitions: TagDefinitionData[],
  filename: string = "vocal-tags",
): void {
  const json = serializeTagConfig(definitions);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validiert den Inhalt einer importierten JSON-Datei.
 * Prüft: Array-Format, Pflichtfelder, Feldtypen.
 */
export function validateTagConfigJson(jsonString: string): TagConfigValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      definitions: [],
      errors: ["Ungültiges JSON-Format: Die Datei enthält kein gültiges JSON."],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: false,
      definitions: [],
      errors: ["Ungültiges Format: Die Datei muss ein JSON-Array enthalten."],
    };
  }

  if (parsed.length === 0) {
    return {
      valid: false,
      definitions: [],
      errors: ["Das JSON-Array ist leer. Es sind keine Tag-Definitionen enthalten."],
    };
  }

  const errors: string[] = [];
  const definitions: TagConfigImportItem[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    const pos = i + 1;

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push(`Eintrag ${pos}: Muss ein Objekt sein.`);
      continue;
    }

    const obj = item as Record<string, unknown>;

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (obj[field] === undefined || obj[field] === null) {
        errors.push(`Eintrag ${pos}: Pflichtfeld '${field}' fehlt.`);
      }
    }

    // Check field types
    if (obj.tag !== undefined && typeof obj.tag !== "string") {
      errors.push(`Eintrag ${pos}: Feld 'tag' muss ein String sein.`);
    }
    if (obj.label !== undefined && typeof obj.label !== "string") {
      errors.push(`Eintrag ${pos}: Feld 'label' muss ein String sein.`);
    }
    if (obj.icon !== undefined && typeof obj.icon !== "string") {
      errors.push(`Eintrag ${pos}: Feld 'icon' muss ein String sein.`);
    }
    if (obj.color !== undefined && typeof obj.color !== "string") {
      errors.push(`Eintrag ${pos}: Feld 'color' muss ein String sein.`);
    }
    if (obj.indexNr !== undefined && typeof obj.indexNr !== "number") {
      errors.push(`Eintrag ${pos}: Feld 'indexNr' muss eine Zahl sein.`);
    }

    // If no errors for this item, add to definitions
    if (
      typeof obj.tag === "string" &&
      typeof obj.label === "string" &&
      typeof obj.icon === "string" &&
      typeof obj.color === "string" &&
      typeof obj.indexNr === "number"
    ) {
      definitions.push({
        tag: obj.tag,
        label: obj.label,
        icon: obj.icon,
        color: obj.color,
        indexNr: obj.indexNr,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, definitions: [], errors };
  }

  return { valid: true, definitions, errors: [] };
}

/**
 * Liest eine JSON-Datei und gibt den Inhalt als String zurück.
 */
export async function readJsonFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsText(file);
  });
}

/**
 * Prüft importierte Tag-Definitionen auf Duplikate mit bestehenden Tags.
 */
export function checkDuplicates(
  importItems: TagConfigImportItem[],
  existingTags: TagDefinitionData[],
): DuplicateCheckResult {
  const existingTagSet = new Set(existingTags.map((t) => t.tag));

  const newItems: TagConfigImportItem[] = [];
  const duplicates: TagConfigImportItem[] = [];

  for (const item of importItems) {
    if (existingTagSet.has(item.tag)) {
      duplicates.push(item);
    } else {
      newItems.push(item);
    }
  }

  return { newItems, duplicates };
}
