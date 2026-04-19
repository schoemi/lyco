import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { COVERS_DIR } from "@/lib/storage";

/**
 * Maximale Dateigröße für heruntergeladene Cover-Bilder (5 MB).
 */
const MAX_DOWNLOAD_SIZE = 5 * 1024 * 1024;

/**
 * Erlaubte Content-Types für Cover-Bilder.
 */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Lädt ein Cover-Bild von einer externen URL herunter und speichert es lokal.
 * Gibt die lokale Cover-URL zurück (z.B. `/api/uploads/covers/uuid.jpg`).
 *
 * Bei Fehlern (Netzwerk, ungültiger Content-Type, zu groß) wird `null` zurückgegeben,
 * damit der Import nicht fehlschlägt.
 */
export async function downloadCoverToLocal(
  externalUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(externalUrl, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(`Cover-Download fehlgeschlagen: ${response.status} für ${externalUrl}`);
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const ext = ALLOWED_CONTENT_TYPES[contentType];

    if (!ext) {
      // Fallback: Versuche Extension aus URL abzuleiten
      const urlExt = guessExtensionFromUrl(externalUrl);
      if (!urlExt) {
        console.warn(`Cover-Download: Unbekannter Content-Type "${contentType}" für ${externalUrl}`);
        return null;
      }
      return await saveBuffer(response, urlExt, externalUrl);
    }

    return await saveBuffer(response, ext, externalUrl);
  } catch (error) {
    console.warn("Cover-Download fehlgeschlagen:", error);
    return null;
  }
}

/**
 * Versucht die Dateiendung aus der URL abzuleiten.
 */
function guessExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return ".jpg";
    if (pathname.endsWith(".png")) return ".png";
    if (pathname.endsWith(".webp")) return ".webp";
  } catch {
    // URL-Parsing fehlgeschlagen
  }
  return null;
}

async function saveBuffer(
  response: Response,
  ext: string,
  externalUrl: string,
): Promise<string | null> {
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_DOWNLOAD_SIZE) {
    console.warn(`Cover-Download: Datei zu groß (${arrayBuffer.byteLength} bytes) für ${externalUrl}`);
    return null;
  }

  const buffer = Buffer.from(arrayBuffer);

  await mkdir(COVERS_DIR, { recursive: true });

  const filename = `${randomUUID()}${ext}`;
  const filepath = join(COVERS_DIR, filename);
  await writeFile(filepath, buffer);

  return `/api/uploads/covers/${filename}`;
}
