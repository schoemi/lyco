import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Property-Based Tests für den SSO-Linking-Service
 *
 * Property 1: LinkingSession-Erstellung ist vollständig und zeitlich begrenzt
 *   (Upsert-Idempotenz)
 *
 * **Validates: Requirements 1.1, 1.2**
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ssoLinkingSession: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { generateState, generateCodeVerifier, computeCodeChallenge } from "@/lib/services/sso-linking-service";

const mockPrisma = vi.mocked(prisma);

const PBT_CONFIG = { numRuns: 100 };

/**
 * Hilfsfunktion: Simuliert die Session-Erstellungslogik des LinkInitiators.
 * Baut das Session-Objekt exakt so wie es im Initiator-Endpunkt entstehen wird:
 *   state = generateState()
 *   codeVerifier = generateCodeVerifier()
 *   expiresAt = now + 15 Minuten
 *   userId = aus der aktiven Session
 *
 * Ruft prisma.ssoLinkingSession.upsert auf und gibt die erstellte Session zurück.
 */
async function createLinkingSession(userId: string) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const session = await prisma.ssoLinkingSession.upsert({
    where: { userId },
    create: { userId, state, codeVerifier, expiresAt },
    update: { state, codeVerifier, expiresAt },
  });

  return session;
}

/**
 * Property 1: LinkingSession-Erstellung ist vollständig und zeitlich begrenzt
 *
 * Für jede authentifizierte userId muss die Link-Initiierungs-Logik eine
 * SsoLinkingSession erzeugen, die:
 * - Einen nicht-leeren `state` enthält
 * - Einen nicht-leeren `codeVerifier` enthält
 * - Die korrekte `userId` enthält
 * - Ein `expiresAt` hat, das strikt zwischen now() und now() + 15 Minuten liegt
 *
 * Beim zweiten Aufruf für die gleiche userId soll genau eine aktive Session
 * existieren (Upsert-Idempotenz).
 *
 * **Validates: Requirements 1.1, 1.2**
 */
describe("Property 1: LinkingSession-Erstellung ist vollständig und zeitlich begrenzt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("erzeugte Session enthält nicht-leeren state, codeVerifier und korrekte userId", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Beliebige nicht-leere userId (CUID-ähnliche Strings)
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          // Die expiresAt wird innerhalb der createLinkingSession-Funktion berechnet.
          // Wir messen now() kurz vor dem Aufruf, um das erwartete Fenster zu ermitteln.
          const beforeCall = Date.now();

          // Mock: Prisma gibt das upsert-Argument (create-Daten) zurück,
          // inklusive der generierten Felder.
          mockPrisma.ssoLinkingSession.upsert.mockImplementationOnce(
            async (args: any) => ({
              id: "session-id-mock",
              userId: args.create.userId as string,
              state: args.create.state as string,
              codeVerifier: args.create.codeVerifier as string,
              expiresAt: args.create.expiresAt as Date,
              createdAt: new Date(),
            })
          );

          const session = await createLinkingSession(userId);

          const afterCall = Date.now();

          // 1. state ist nicht leer
          expect(session.state).toBeTruthy();
          expect(typeof session.state).toBe("string");
          expect((session.state as string).length).toBeGreaterThan(0);

          // 2. codeVerifier ist nicht leer
          expect(session.codeVerifier).toBeTruthy();
          expect(typeof session.codeVerifier).toBe("string");
          expect((session.codeVerifier as string).length).toBeGreaterThan(0);

          // 3. userId stimmt überein
          expect(session.userId).toBe(userId);

          // 4. expiresAt liegt strikt zwischen now() und now() + 15 Minuten
          const expiresAtMs = (session.expiresAt as Date).getTime();
          const maxExpiry = afterCall + 15 * 60 * 1000;
          const minExpiry = beforeCall; // muss nach dem Aufruf-Zeitpunkt liegen (> now beim Aufruf)

          expect(expiresAtMs).toBeGreaterThan(minExpiry);
          expect(expiresAtMs).toBeLessThanOrEqual(maxExpiry);
        }
      ),
      PBT_CONFIG
    );
  });

  it("state ist base64url-kodiert und hat mindestens 43 Zeichen (≥256 Bit Entropie)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          mockPrisma.ssoLinkingSession.upsert.mockImplementationOnce(
            async (args: any) => ({
              id: "session-id-mock",
              userId: args.create.userId as string,
              state: args.create.state as string,
              codeVerifier: args.create.codeVerifier as string,
              expiresAt: args.create.expiresAt as Date,
              createdAt: new Date(),
            })
          );

          const session = await createLinkingSession(userId);

          // Base64url-Zeichensatz: [A-Za-z0-9\-_]
          const base64urlPattern = /^[A-Za-z0-9\-_]+$/;
          expect(base64urlPattern.test(session.state as string)).toBe(true);

          // 32 Bytes → 43 Zeichen base64url (ohne Padding)
          expect((session.state as string).length).toBeGreaterThanOrEqual(43);
        }
      ),
      PBT_CONFIG
    );
  });

  it("codeVerifier ist base64url-kodiert und PKCE-konform (43 Zeichen)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          mockPrisma.ssoLinkingSession.upsert.mockImplementationOnce(
            async (args: any) => ({
              id: "session-id-mock",
              userId: args.create.userId as string,
              state: args.create.state as string,
              codeVerifier: args.create.codeVerifier as string,
              expiresAt: args.create.expiresAt as Date,
              createdAt: new Date(),
            })
          );

          const session = await createLinkingSession(userId);

          // Base64url-Zeichensatz (RFC 7636)
          const base64urlPattern = /^[A-Za-z0-9\-_]+$/;
          expect(base64urlPattern.test(session.codeVerifier as string)).toBe(true);

          // RFC 7636: code_verifier muss mindestens 43 Zeichen haben
          expect((session.codeVerifier as string).length).toBeGreaterThanOrEqual(43);
        }
      ),
      PBT_CONFIG
    );
  });

  it("Upsert-Idempotenz: Zweiter Aufruf für dieselbe userId überschreibt die Session (genau ein Eintrag)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          // Zustands-Tracking: Wir simulieren eine In-Memory-Session-Tabelle
          // mit @unique auf userId (entspricht dem DB-Constraint).
          const sessionStore = new Map<string, object>();

          mockPrisma.ssoLinkingSession.upsert.mockImplementation(
            async (args: any) => {
              const uid = args.where.userId as string;
              const sessionData = {
                id: sessionStore.has(uid) ? "existing-session-id" : "new-session-id",
                userId: args.create.userId as string,
                state: args.create.state as string,
                codeVerifier: args.create.codeVerifier as string,
                expiresAt: args.create.expiresAt as Date,
                createdAt: new Date(),
              };
              // Upsert: überschreibt existierende Session oder legt neue an
              sessionStore.set(uid, sessionData);
              return sessionData;
            }
          );

          // Erster Aufruf
          const firstSession = await createLinkingSession(userId);

          // Zweiter Aufruf für dieselbe userId
          const secondSession = await createLinkingSession(userId);

          // Nach beiden Aufrufen: genau ein Eintrag für diese userId
          expect(sessionStore.size).toBe(1);
          expect(sessionStore.has(userId)).toBe(true);

          // Der zweite Aufruf hat neue state/codeVerifier-Werte erzeugt
          // (Upsert überschreibt die alten Werte)
          expect(secondSession.userId).toBe(userId);
          expect(firstSession.userId).toBe(userId);

          // Upsert wurde genau zweimal aufgerufen
          expect(mockPrisma.ssoLinkingSession.upsert).toHaveBeenCalledTimes(2);

          // Beide Aufrufe verwendeten dieselbe userId als where-Bedingung
          const calls = mockPrisma.ssoLinkingSession.upsert.mock.calls;
          expect((calls[0][0] as any).where.userId).toBe(userId);
          expect((calls[1][0] as any).where.userId).toBe(userId);
        }
      ),
      PBT_CONFIG
    );
  });

  it("expiresAt liegt immer genau 15 Minuten nach der Erstellung (±1 Sekunde Toleranz)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (userId) => {
          vi.clearAllMocks();

          const beforeCall = Date.now();

          mockPrisma.ssoLinkingSession.upsert.mockImplementationOnce(
            async (args: any) => ({
              id: "session-id-mock",
              userId: args.create.userId as string,
              state: args.create.state as string,
              codeVerifier: args.create.codeVerifier as string,
              expiresAt: args.create.expiresAt as Date,
              createdAt: new Date(),
            })
          );

          const session = await createLinkingSession(userId);

          const afterCall = Date.now();

          const expiresAtMs = (session.expiresAt as Date).getTime();
          const fifteenMinMs = 15 * 60 * 1000;

          // expiresAt sollte ≈ now + 15 Minuten sein (mit 1s Toleranz für Testlaufzeit)
          const expectedMin = beforeCall + fifteenMinMs;
          const expectedMax = afterCall + fifteenMinMs + 1000; // 1s Toleranz

          expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin);
          expect(expiresAtMs).toBeLessThanOrEqual(expectedMax);
        }
      ),
      PBT_CONFIG
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Authorization-URL enthält alle PKCE/Security-Parameter
// ---------------------------------------------------------------------------

/**
 * Helper: Konstruiert eine OIDC-Authorization-URL so wie es der LinkInitiator tut.
 *
 * Die Parameter entsprechen exakt dem, was Task 3.1 / das Design-Dokument spezifiziert:
 *   response_type=code
 *   client_id
 *   redirect_uri → NEXTAUTH_URL + /api/auth/sso/link/callback
 *   scope
 *   state
 *   code_challenge
 *   code_challenge_method=S256
 */
function buildAuthorizationUrl(
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  state: string,
  codeChallenge: string
): URL {
  const url = new URL(authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

/**
 * Property 3: Authorization-URL enthält alle PKCE/Security-Parameter
 *
 * Für beliebige generierte `state` und `code_challenge` muss die konstruierte
 * OIDC-Authorization-URL enthalten:
 *   - response_type=code
 *   - state (exakt der generierte Wert)
 *   - code_challenge (exakt der berechnete Wert)
 *   - code_challenge_method=S256
 *   - redirect_uri zeigt auf /api/auth/sso/link/callback
 *
 * **Validates: Requirements 1.3, 5.4**
 */
describe("Property 3: Authorization-URL enthält alle PKCE/Security-Parameter", () => {
  /**
   * 3a: Alle erforderlichen PKCE/Security-Query-Parameter sind für jede
   * Kombination aus state, code_challenge, client_id und Authorization-Endpunkt vorhanden.
   */
  it("3a: konstruierte URL enthält immer response_type, state, code_challenge, code_challenge_method=S256", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 99 }),
        // Nur sichere Zeichen für client_id (wie in OIDC üblich)
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => /^[A-Za-z0-9._~-]+$/.test(s)),
        async (_i, clientId) => {
          const state = generateState();
          const verifier = generateCodeVerifier();
          const codeChallenge = await computeCodeChallenge(verifier);

          const authEndpoint = "https://auth.example.com/application/o/authorize/";
          const baseUrl = "https://app.example.com";
          const redirectUri = `${baseUrl}/api/auth/sso/link/callback`;

          const url = buildAuthorizationUrl(
            authEndpoint,
            clientId,
            redirectUri,
            "openid email profile",
            state,
            codeChallenge
          );

          const params = url.searchParams;

          // response_type muss "code" sein
          expect(params.get("response_type")).toBe("code");

          // state muss exakt dem generierten Wert entsprechen
          expect(params.get("state")).toBe(state);

          // code_challenge muss exakt dem berechneten Wert entsprechen
          expect(params.get("code_challenge")).toBe(codeChallenge);

          // code_challenge_method muss S256 sein
          expect(params.get("code_challenge_method")).toBe("S256");
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 3b: redirect_uri zeigt immer auf /api/auth/sso/link/callback
   * unabhängig von der Basis-URL (NEXTAUTH_URL).
   */
  it("3b: redirect_uri endet immer mit /api/auth/sso/link/callback", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Plausible NEXTAUTH_URL-Basiswerte
        fc.constantFrom(
          "https://app.example.com",
          "https://lyco.example.org",
          "https://staging.myapp.dev",
          "http://localhost:3000"
        ),
        async (baseUrl) => {
          const state = generateState();
          const verifier = generateCodeVerifier();
          const codeChallenge = await computeCodeChallenge(verifier);

          const redirectUri = `${baseUrl}/api/auth/sso/link/callback`;

          const url = buildAuthorizationUrl(
            "https://auth.example.com/authorize/",
            "my-client-id",
            redirectUri,
            "openid email profile",
            state,
            codeChallenge
          );

          const actualRedirectUri = url.searchParams.get("redirect_uri");
          expect(actualRedirectUri).not.toBeNull();
          expect(actualRedirectUri!.endsWith("/api/auth/sso/link/callback")).toBe(true);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 3c: Der state-Parameter in der URL bewahrt den generierten state-Wert exakt —
   * keine Trunkierung, kein Encoding-Verlust, keine Mutation.
   */
  it("3c: state-Wert wird in der URL exakt bewahrt (kein Verlust durch URL-Encoding)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 99 }),
        async (_i) => {
          const state = generateState();
          const verifier = generateCodeVerifier();
          const codeChallenge = await computeCodeChallenge(verifier);

          const url = buildAuthorizationUrl(
            "https://auth.example.com/authorize/",
            "client-id",
            "https://app.example.com/api/auth/sso/link/callback",
            "openid email profile",
            state,
            codeChallenge
          );

          // URL-String round-trip: erneut parsen und Parameter prüfen
          const reparsed = new URL(url.toString());
          expect(reparsed.searchParams.get("state")).toBe(state);
          expect(reparsed.searchParams.get("code_challenge")).toBe(codeChallenge);
        }
      ),
      PBT_CONFIG
    );
  });

  /**
   * 3d: Zwei verschiedene (state, code_challenge)-Paare erzeugen immer verschiedene URLs —
   * kein Aliasing zwischen verschiedenen PKCE-Sessions.
   */
  it("3d: verschiedene (state, code_challenge)-Paare erzeugen immer verschiedene URLs", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 99 }),
        async (_i) => {
          // Zwei unabhängige PKCE-Sessions generieren
          const state1 = generateState();
          const verifier1 = generateCodeVerifier();
          const challenge1 = await computeCodeChallenge(verifier1);

          const state2 = generateState();
          const verifier2 = generateCodeVerifier();
          const challenge2 = await computeCodeChallenge(verifier2);

          // Mit 256-Bit-Entropie ist die Kollisionswahrscheinlichkeit vernachlässigbar
          fc.pre(state1 !== state2 || challenge1 !== challenge2);

          const url1 = buildAuthorizationUrl(
            "https://auth.example.com/authorize/",
            "client-id",
            "https://app.example.com/api/auth/sso/link/callback",
            "openid email profile",
            state1,
            challenge1
          );

          const url2 = buildAuthorizationUrl(
            "https://auth.example.com/authorize/",
            "client-id",
            "https://app.example.com/api/auth/sso/link/callback",
            "openid email profile",
            state2,
            challenge2
          );

          expect(url1.toString()).not.toBe(url2.toString());
        }
      ),
      PBT_CONFIG
    );
  });
});
