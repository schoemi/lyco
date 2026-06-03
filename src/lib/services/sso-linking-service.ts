/**
 * SSO-Linking-Service: Reine PKCE- und OIDC-Logik ohne Next.js-Abhängigkeiten.
 * Requirements: 1.1, 1.3, 2.4, 5.2, 5.4, 5.5, 5.6
 */

// ---------------------------------------------------------------------------
// Hilfsfunktion: base64url-Kodierung
// ---------------------------------------------------------------------------

/**
 * Kodiert ein Uint8Array oder ArrayBuffer als base64url-String
 * (base64 mit Ersetzen von `+` → `-`, `/` → `_`, ohne `=`-Padding).
 */
function toBase64Url(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  // btoa benötigt einen binären String
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ---------------------------------------------------------------------------
// PKCE-Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Generiert einen kryptographisch zufälligen State-Token (32 Bytes → ≥256 Bit, base64url-kodiert).
 * Wird als OIDC-`state`-Parameter verwendet.
 */
export function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/**
 * Generiert einen PKCE `code_verifier` (32 Bytes, base64url-kodiert, 43 Zeichen).
 * Konform mit RFC 7636.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/**
 * Berechnet die PKCE `code_challenge`: BASE64URL(SHA-256(ASCII(verifier))).
 * Konform mit RFC 7636, Methode S256.
 */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(digest);
}

// ---------------------------------------------------------------------------
// OIDC-Discovery
// ---------------------------------------------------------------------------

/**
 * Führt OIDC-Discovery durch und gibt den `authorization_endpoint` zurück.
 * Ruft `{issuerUrl}/.well-known/openid-configuration` ab.
 *
 * @throws Error wenn der Endpunkt nicht erreichbar ist oder das Dokument
 *         kein `authorization_endpoint` enthält.
 */
export async function discoverAuthorizationEndpoint(
  issuerUrl: string
): Promise<string> {
  const discoveryUrl = `${issuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl);
  if (!response.ok) {
    throw new Error(
      `OIDC-Discovery fehlgeschlagen: HTTP ${response.status} für ${discoveryUrl}`
    );
  }
  const config = (await response.json()) as Record<string, unknown>;
  const authEndpoint = config["authorization_endpoint"];
  if (typeof authEndpoint !== "string" || !authEndpoint) {
    throw new Error(
      `OIDC-Discovery: kein gültiger authorization_endpoint in ${discoveryUrl}`
    );
  }
  return authEndpoint;
}

// ---------------------------------------------------------------------------
// Token-Exchange
// ---------------------------------------------------------------------------

export interface ExchangeCodeParams {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  redirectUri: string;
  /** Optionaler direkter Token-Endpunkt; wenn nicht angegeben, wird er per OIDC-Discovery ermittelt. */
  tokenEndpoint?: string;
}

/**
 * Tauscht den OIDC-Authorization-Code gegen ein ID-Token aus.
 * Verwendet PKCE und sendet einen 10-Sekunden-Timeout-AbortSignal.
 *
 * @returns `{ idToken: string }` bei Erfolg oder `{ error: string }` bei Fehler/Timeout.
 */
export async function exchangeCodeForToken(
  params: ExchangeCodeParams
): Promise<{ idToken: string } | { error: string }> {
  try {
    // Token-Endpunkt ermitteln (direkt übergeben oder per Discovery)
    let tokenEndpoint = params.tokenEndpoint;
    if (!tokenEndpoint) {
      const discoveryUrl = `${params.issuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const discoveryResponse = await fetch(discoveryUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!discoveryResponse.ok) {
        return {
          error: `OIDC-Discovery fehlgeschlagen: HTTP ${discoveryResponse.status}`,
        };
      }
      const config = (await discoveryResponse.json()) as Record<string, unknown>;
      const endpoint = config["token_endpoint"];
      if (typeof endpoint !== "string" || !endpoint) {
        return { error: "OIDC-Discovery: kein token_endpoint gefunden" };
      }
      tokenEndpoint = endpoint;
    }

    // Token-Exchange via POST
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        error: `Token-Exchange fehlgeschlagen: HTTP ${response.status} – ${errorBody}`,
      };
    }

    const tokenResponse = (await response.json()) as Record<string, unknown>;
    const idToken = tokenResponse["id_token"];
    if (typeof idToken !== "string" || !idToken) {
      return { error: "Token-Exchange: kein id_token in der Antwort" };
    }

    return { idToken };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        error.message.includes("timeout") ||
        error.message.includes("aborted"));

    return {
      error: isTimeout
        ? "Token-Exchange-Timeout (10s überschritten)"
        : `Token-Exchange-Fehler: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// ID-Token-Verifikation (JWKS / RS256)
// ---------------------------------------------------------------------------

interface JwkKey {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
}

interface JwksDocument {
  keys: JwkKey[];
}

/**
 * Parst den Header eines JWT (ohne Signaturverifikation).
 */
function parseJwtHeader(token: string): Record<string, unknown> | null {
  try {
    const [headerB64] = token.split(".");
    if (!headerB64) return null;
    // base64url → base64
    const base64 = headerB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Parst die Claims-Payload eines JWT (ohne Signaturverifikation).
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadB64 = parts[1];
    const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Konvertiert einen base64url-kodierten Big-Integer-Wert (wie RSA `n` oder `e`)
 * in ein Uint8Array.
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifiziert ein ID-Token gegen das JWKS des OIDC-Providers und gibt die
 * verifizierten Claims zurück.
 *
 * Unterstützt RS256. Gibt `null` zurück wenn:
 * - das Token nicht geparst werden kann
 * - kein passender JWK gefunden wird
 * - die Signaturverifikation fehlschlägt
 * - der `sub`-Claim fehlt
 *
 * Requirements: 5.6
 */
export async function verifyIdToken(
  idToken: string,
  issuerUrl: string
): Promise<{ sub: string; [key: string]: unknown } | null> {
  try {
    // 1. JWT-Header parsen
    const header = parseJwtHeader(idToken);
    if (!header) return null;

    const alg = header["alg"];
    const kid = header["kid"] as string | undefined;

    // Nur RS256 wird unterstützt
    if (alg !== "RS256") {
      return null;
    }

    // 2. JWKS abrufen (zuerst via Discovery, dann direkt)
    let jwksUri: string | null = null;

    try {
      const discoveryUrl = `${issuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const discoveryResponse = await fetch(discoveryUrl);
      if (discoveryResponse.ok) {
        const config = (await discoveryResponse.json()) as Record<string, unknown>;
        const uri = config["jwks_uri"];
        if (typeof uri === "string" && uri) {
          jwksUri = uri;
        }
      }
    } catch {
      // Discovery fehlgeschlagen — Fallback auf Standard-JWKS-URI
    }

    if (!jwksUri) {
      jwksUri = `${issuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`;
    }

    const jwksResponse = await fetch(jwksUri);
    if (!jwksResponse.ok) {
      return null;
    }

    const jwks = (await jwksResponse.json()) as JwksDocument;
    if (!Array.isArray(jwks.keys)) {
      return null;
    }

    // 3. Passenden JWK suchen
    let matchingKey: JwkKey | undefined;
    if (kid) {
      matchingKey = jwks.keys.find(
        (k) => k.kty === "RSA" && k.kid === kid
      );
    }
    // Fallback: ersten RSA-Signing-Key verwenden
    if (!matchingKey) {
      matchingKey = jwks.keys.find(
        (k) => k.kty === "RSA" && (!k.use || k.use === "sig")
      );
    }

    if (!matchingKey || !matchingKey.n || !matchingKey.e) {
      return null;
    }

    // 4. CryptoKey aus JWK importieren
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      {
        kty: "RSA",
        n: matchingKey.n,
        e: matchingKey.e,
        alg: "RS256",
        use: "sig",
        ext: true,
      },
      { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
      false,
      ["verify"]
    );

    // 5. Signatur verifizieren
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(signatureB64);

    const isValid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      cryptoKey,
      signature as Uint8Array<ArrayBuffer>,
      signingInput
    );

    if (!isValid) {
      return null;
    }

    // 6. Claims parsen und zurückgeben
    const claims = parseJwtPayload(idToken);
    if (!claims) return null;

    const sub = claims["sub"];
    if (typeof sub !== "string" || !sub) {
      return null;
    }

    return claims as { sub: string; [key: string]: unknown };
  } catch {
    return null;
  }
}
