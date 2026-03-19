/**
 * Konvertiert FontAwesome CSS-Klassen in Iconify-Icon-Namen.
 *
 * "fa-solid fa-microphone" → "fa6-solid:microphone"
 * "fa-regular fa-heart"    → "fa6-regular:heart"
 * "fa-brands fa-spotify"   → "fa6-brands:spotify"
 *
 * Falls der String bereits im Iconify-Format ist (enthält ":"), wird er unverändert zurückgegeben.
 */
export function faClassToIconify(faClass: string): string {
  if (faClass.includes(":")) return faClass;

  const parts = faClass.trim().split(/\s+/);
  let prefix = "fa6-solid";
  let name = "";

  for (const part of parts) {
    if (part === "fa-solid") prefix = "fa6-solid";
    else if (part === "fa-regular") prefix = "fa6-regular";
    else if (part === "fa-brands") prefix = "fa6-brands";
    else if (part.startsWith("fa-") && part !== "fa-spin") {
      name = part.slice(3); // strip "fa-"
    }
  }

  if (!name) return faClass;
  return `${prefix}:${name}`;
}

/** Fallback-Icon für unbekannte Tags */
export const UNKNOWN_TAG_ICON = "fa6-solid:circle-question";
