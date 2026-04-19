/**
 * Gibt die richtige Bild-URL für ein Cover zurück.
 *
 * - Lokale URLs (`/api/uploads/covers/...`) werden direkt verwendet.
 * - Externe URLs (https://...) werden über den Proxy geleitet.
 * - `null` wird als `null` zurückgegeben.
 */
export function getCoverSrc(coverUrl: string | null): string | null {
  if (!coverUrl) return null;

  // Lokale Uploads direkt verwenden
  if (coverUrl.startsWith("/")) return coverUrl;

  // Externe URLs über den Proxy leiten
  return `/api/cover-proxy?url=${encodeURIComponent(coverUrl)}`;
}
