/**
 * Lyco Stage — Service Worker
 *
 * Strategie:
 * 1. Cache-First für /api/stage/* Endpunkte
 * 2. Cache-First für Stage-Assets (/stage/*, JS, CSS, Fonts)
 * 3. Network-First für alles andere
 * 4. Stale-While-Revalidate: Bei Online-Zugang wird der Cache im Hintergrund aktualisiert
 *
 * Anforderungen: 3.1, 3.2, 3.3
 */

const STAGE_CACHE = "lyco-stage-v1";

const STAGE_API_URLS = ["/api/stage/bundle", "/api/stage/progress"];

/** Prüft ob eine URL zu den Stage-API-Endpunkten gehört */
function isStageApiUrl(url) {
  const pathname = new URL(url).pathname;
  return STAGE_API_URLS.some((apiUrl) => pathname === apiUrl);
}

/** Prüft ob eine URL zu den Stage-Assets gehört (JS, CSS, Fonts, /stage/*) */
function isStageAsset(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname;
  if (pathname.startsWith("/stage")) return true;
  if (pathname.match(/\.(js|css|woff2?|ttf|otf|eot)(\?.*)?$/)) return true;
  return false;
}

/**
 * Cache-First-Strategie mit Stale-While-Revalidate im Hintergrund.
 * Gibt gecachte Antwort zurück (falls vorhanden), aktualisiert Cache im Hintergrund wenn online.
 */
async function cacheFirstWithRevalidate(request, cache) {
  const cached = await cache.match(request);
  if (cached) {
    // Stale-While-Revalidate: Cache im Hintergrund aktualisieren
    const revalidate = fetch(request.clone())
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(() => {
        // Netzwerkfehler beim Revalidieren ignorieren — gecachte Version bleibt gültig
      });
    // Hintergrund-Revalidierung nicht abwarten
    void revalidate;
    return cached;
  }

  // Kein Cache-Eintrag — Netzwerk versuchen und cachen
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Netzwerkfehler ohne Cache — Fehler weitergeben
    throw err;
  }
}

/**
 * Network-First-Strategie.
 * Versucht zuerst das Netzwerk; bei Fehler gecachte Version zurückgeben.
 */
async function networkFirst(request, cache) {
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Haupt-Fetch-Handler — wählt Strategie basierend auf URL.
 * Exportiert für Tests.
 */
async function handleFetch(event) {
  const { request } = event;

  // POST-Requests und API-Auth-Requests niemals cachen — direkt ans Netzwerk
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/auth")) {
    return fetch(request);
  }

  const cache = await caches.open(STAGE_CACHE);

  if (isStageApiUrl(request.url) || isStageAsset(request.url)) {
    return cacheFirstWithRevalidate(request, cache);
  }

  return networkFirst(request, cache);
}

// Service Worker Event-Listener (nur im SW-Kontext registrieren)
if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener("fetch", (event) => {
    event.respondWith(handleFetch(event));
  });
}

// Exports für Tests (CommonJS/ESM-kompatibel)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STAGE_CACHE,
    STAGE_API_URLS,
    isStageApiUrl,
    isStageAsset,
    cacheFirstWithRevalidate,
    networkFirst,
    handleFetch,
  };
}
