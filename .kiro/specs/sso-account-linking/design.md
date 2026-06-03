# Design Document: SSO Account Linking

## Overview

Dieser Flow ermöglicht einem bereits eingeloggten Lyco-User, seinen Account im Profil manuell mit dem Authentik OIDC-Provider zu verknüpfen — auch wenn die E-Mails beider Accounts voneinander abweichen. Die Architektur folgt einem sessionbasierten PKCE-Flow mit einem separaten, eigenen Callback-Endpunkt, sodass der bestehende NextAuth-Login-Flow vollständig unberührt bleibt.

---

## Architecture

### High-Level Flow

```
Profile Page
    │
    ├─ [Link Button] → GET /api/auth/sso/link/initiate
    │                       │
    │                       ├─ generateState() + generateCodeVerifier()
    │                       ├─ upsert SsoLinkingSession (userId, state, verifier, expiresAt)
    │                       └─ 302 → OIDC Authorization URL
    │
    │              OIDC Provider (Authentik)
    │                       │
    │                       └─ User authenticates → 302 → /api/auth/sso/link/callback?code=...&state=...
    │
    ├─ GET /api/auth/sso/link/callback
    │       │
    │       ├─ validate state → lookup SsoLinkingSession
    │       ├─ exchange code+verifier → ID-Token (manual fetch)
    │       ├─ extract sub from ID-Token (JWKS-verified)
    │       ├─ upsert SsoAccount { userId from Session!, provider, sub }
    │       ├─ delete SsoLinkingSession
    │       ├─ write AuditLog
    │       └─ 302 → /profile?success=sso-linked
    │
    └─ [Unlink Button] → DELETE /api/auth/sso/unlink
                             │
                             ├─ delete all SsoAccount entries for userId
                             ├─ write AuditLog
                             └─ 200 { unlinked: true }
```

### Component Boundaries

| Layer | Komponente | Verantwortung |
|---|---|---|
| UI | `SsoLinkingPanel` | Status anzeigen, Link/Unlink auslösen, URL-Params verarbeiten |
| API | `LinkInitiator` (`/api/auth/sso/link/initiate`) | Session anlegen, OIDC-Redirect |
| API | `LinkCallbackHandler` (`/api/auth/sso/link/callback`) | Code exchangen, SsoAccount upserten |
| API | `UnlinkHandler` (`DELETE /api/auth/sso/unlink`) | SsoAccount(s) löschen |
| DB | `SsoLinkingSession` (Prisma-Modell) | Temporäre PKCE-Session |
| DB | `SsoAccount` (bereits vorhanden) | Persistente SSO-Verknüpfung |
| Service | `sso-linking-service.ts` | Reine Logik: PKCE, OIDC Discovery, Token-Exchange, Upsert |
| Infra | `auth-env.ts` (bereits vorhanden) | SSO-Konfiguration lesen |
| Infra | `log-service.ts` (bereits vorhanden) | Audit-Log schreiben |

---

## Data Models

### Neues Prisma-Modell: `SsoLinkingSession`

```prisma
model SsoLinkingSession {
  id           String   @id @default(cuid())
  userId       String   @unique        // Genau eine aktive Session pro User (Upsert)
  state        String   @unique        // OIDC state-Parameter (kryptographisch zufällig)
  codeVerifier String                  // PKCE code_verifier (plain, min. 43 Zeichen)
  expiresAt    DateTime                // now() + 15 Minuten
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([state])
  @@index([expiresAt])
  @@map("sso_linking_sessions")
}
```

Hinweis: Das `@unique` auf `userId` erzwingt genau eine aktive Session pro User auf Datenbankebene. Der Upsert in `LinkInitiator` nutzt `upsert({ where: { userId }, ... })` um existierende Sessions zu überschreiben.

### Bestehendes Modell: `SsoAccount` (keine Änderungen)

```prisma
model SsoAccount {
  id                String   @id @default(cuid())
  userId            String
  provider          String   // "authentik"
  providerAccountId String   // sub-Claim aus dem ID-Token
  createdAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])  // verhindert doppelte sub-Zuordnung
  @@index([userId])
  @@map("sso_accounts")
}
```

---

## Components and Interfaces

### 1. `SsoLinkingPanel` (React Client Component)

Ersetzt und erweitert die bestehende `SsoStatus`-Komponente. Die alte Datei `sso-status.tsx` wird umbenannt in `sso-linking-panel.tsx`, der Export von `SsoStatus` auf `SsoLinkingPanel` geändert, und `profile/page.tsx` entsprechend aktualisiert.

```typescript
// src/components/auth/sso-linking-panel.tsx
"use client";

interface SsoLinkStatus {
  linked: boolean;
  provider?: string;        // "Authentik" (kapitalisiert vom link-status endpoint)
  ssoConfigured: boolean;   // neu: kommt vom /api/auth/sso/link-status endpoint
}

type PanelState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "linked"; provider: string }
  | { type: "unlinked" }
  | { type: "sso-not-configured" };

// Verarbeitete URL-Query-Parameter
type UrlFeedback =
  | { type: "success"; key: "sso-linked" }
  | { type: "error"; key: "sso-link-failed" | "sso-link-timeout" | "sso-link-denied" | "sso-link-invalid-state" | "sso-already-linked" }
  | null;
```

**Zustandsübergänge:**

1. Mount → fetch `/api/auth/sso/link-status` → `loading` → `linked | unlinked | sso-not-configured | error`
2. Link-Button-Klick → `window.location.href = "/api/auth/sso/link/initiate"` (voller Page-Redirect)
3. Nach Rückkehr vom Callback: URL-Params auswerten, Feedback anzeigen, Status neu laden, URL bereinigen via `router.replace`
4. Unlink-Button-Klick → `window.confirm(...)` → bei Bestätigung: `DELETE /api/auth/sso/unlink` → Status neu laden

### 2. `LinkInitiator` — `GET /api/auth/sso/link/initiate`

```typescript
// src/app/api/auth/sso/link/initiate/route.ts

export async function GET(request: Request): Promise<Response> {
  // 1. Auth-Check → 401
  // 2. SSO-Config-Check → 503
  // 3. OIDC Discovery (fetch /.well-known/openid-configuration)
  // 4. generateState() → 32 Bytes crypto.getRandomValues → base64url → ≥256 Bit
  // 5. generateCodeVerifier() → 32 Bytes → base64url (43 Zeichen, PKCE-konform)
  // 6. computeCodeChallenge(verifier) → SHA-256 → base64url
  // 7. upsert SsoLinkingSession { userId, state, codeVerifier, expiresAt: now+15min }
  //    → bei DB-Fehler: 500, kein Redirect
  // 8. Redirect 302 → authorizationEndpoint + params
}
```

**Authorization-URL-Parameter:**

| Parameter | Wert |
|---|---|
| `response_type` | `code` |
| `client_id` | `SSO_CLIENT_ID` |
| `redirect_uri` | `${NEXTAUTH_URL}/api/auth/sso/link/callback` |
| `scope` | `openid email profile` |
| `state` | generierter state-Token |
| `code_challenge` | BASE64URL(SHA256(code_verifier)) |
| `code_challenge_method` | `S256` |

### 3. `LinkCallbackHandler` — `GET /api/auth/sso/link/callback`

```typescript
// src/app/api/auth/sso/link/callback/route.ts

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Schritt 1: Provider-Fehler abfangen
  if (error) {
    await deleteLinkingSessionByState(state);
    await logAudit({ action: SSO_LINK_DENIED, ... });
    return redirect("/profile?error=sso-link-denied");
  }

  // Schritt 2: State validieren
  const session = await findActiveLinkingSession(state);
  if (!session) {
    return redirect("/profile?error=sso-link-invalid-state");
  }

  // Schritt 3: Token-Exchange (10s Timeout)
  const tokenResult = await exchangeCodeForToken({
    code, codeVerifier: session.codeVerifier, ...ssoConfig
  });
  if (tokenResult.error) {
    await deleteLinkingSession(session.id);
    await logAudit({ action: SSO_LINK_FAILED, userId: session.userId, ... });
    return redirect("/profile?error=sso-link-failed");
  }

  // Schritt 4: ID-Token verifizieren (JWKS)
  const claims = await verifyIdToken(tokenResult.idToken, ssoConfig.issuerUrl);
  if (!claims || !claims.sub) {
    await deleteLinkingSession(session.id);
    await logAudit({ action: SSO_LINK_FAILED, userId: session.userId, ... });
    return redirect("/profile?error=sso-link-failed");
  }

  // Schritt 5: Conflict-Check (sub bereits anderem User zugeordnet)
  const existingAccount = await prisma.ssoAccount.findUnique({
    where: { provider_providerAccountId: { provider: "authentik", providerAccountId: claims.sub } }
  });
  if (existingAccount && existingAccount.userId !== session.userId) {
    await deleteLinkingSession(session.id);
    await logAudit({ action: SSO_LINK_CONFLICT, userId: session.userId, ... });
    return redirect("/profile?error=sso-already-linked");
  }

  // Schritt 6: Upsert SsoAccount — userId IMMER aus session!
  await prisma.ssoAccount.upsert({ ... userId: session.userId ... });

  // Schritt 7: Session löschen
  await deleteLinkingSession(session.id);

  // Schritt 8: Audit-Log
  await logAudit({ action: SSO_LINK_SUCCESS, userId: session.userId, ... });

  return redirect("/profile?success=sso-linked");
}
```

### 4. `UnlinkHandler` — `DELETE /api/auth/sso/unlink`

```typescript
// src/app/api/auth/sso/unlink/route.ts

export async function DELETE(): Promise<Response> {
  // 1. Auth-Check → 401
  // 2. Count SsoAccounts for userId → 0 → 404
  // 3. deleteMany SsoAccounts where userId → DB-Fehler → 500
  // 4. logAudit(SSO_UNLINK_SUCCESS, userId, providers)
  // 5. return 200 { unlinked: true }
}
```

### 5. `sso-linking-service.ts` (reine Logik, kein Next.js)

```typescript
// src/lib/services/sso-linking-service.ts

/** Generiert einen kryptographisch zufälligen state-Token (32 Bytes → ≥256 Bit, base64url) */
export function generateState(): string;

/** Generiert einen PKCE code_verifier (32 Bytes, base64url, 43 Zeichen) */
export function generateCodeVerifier(): string;

/** Berechnet die PKCE code_challenge: BASE64URL(SHA256(verifier)) */
export async function computeCodeChallenge(verifier: string): Promise<string>;

/** Führt OIDC Discovery durch und gibt den Authorization-Endpoint zurück */
export async function discoverAuthorizationEndpoint(issuerUrl: string): Promise<string>;

/** Tauscht den Authorization-Code gegen ein ID-Token (mit PKCE, 10s Timeout) */
export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  redirectUri: string;
}): Promise<{ idToken: string } | { error: string }>;

/** Verifiziert das ID-Token gegen das JWKS des Providers und gibt die Claims zurück */
export async function verifyIdToken(
  idToken: string,
  issuerUrl: string
): Promise<{ sub: string; [key: string]: unknown } | null>;
```

### 6. Neue Audit-Log-Aktionskonstanten (in `log-service.ts`)

```typescript
export const SSO_LINK_INITIATED = "SSO_LINK_INITIATED";
export const SSO_LINK_SUCCESS   = "SSO_LINK_SUCCESS";
export const SSO_LINK_FAILED    = "SSO_LINK_FAILED";
export const SSO_LINK_DENIED    = "SSO_LINK_DENIED";        // Provider hat error zurückgegeben
export const SSO_LINK_CONFLICT  = "SSO_LINK_CONFLICT";      // sub bereits anderem User zugeordnet
export const SSO_LINK_STATE_REPLAY = "SSO_LINK_STATE_REPLAY"; // state doppelt eingelöst
export const SSO_UNLINK_SUCCESS = "SSO_UNLINK_SUCCESS";
```

---

## Error Handling

### Fehler-Mapping

| Fehlersituation | HTTP-Status / Redirect-URL | Audit-Log |
|---|---|---|
| SSO nicht konfiguriert | `503` | nein |
| User nicht authentifiziert | `401` | nein |
| DB-Fehler beim Session-Speichern | `500` | nein |
| Provider sendet `error` im Callback | `/profile?error=sso-link-denied` | ja |
| state ungültig / Session abgelaufen | `/profile?error=sso-link-invalid-state` | ja |
| Token-Exchange fehlgeschlagen / Timeout | `/profile?error=sso-link-failed` | ja |
| JWKS-Verifikation fehlgeschlagen | `/profile?error=sso-link-failed` | ja |
| sub fehlt oder leer | `/profile?error=sso-link-failed` | ja |
| sub bereits anderem User zugeordnet | `/profile?error=sso-already-linked` | ja |
| state-Token doppelt eingelöst | `/profile?error=sso-link-invalid-state` | ja (SSO_LINK_STATE_REPLAY) |
| Kein SsoAccount beim Unlink | `404` | nein |
| DB-Fehler beim Unlink | `500` | nein |

### Session-Cleanup-Strategie

Jeder Fehler-Pfad im `LinkCallbackHandler` löscht die `SsoLinkingSession` vor dem Redirect. Abgelaufene Sessions werden nicht durch einen separaten Cron-Job bereinigt, sondern:

1. Beim nächsten `initiate`-Aufruf per Upsert überschrieben (gleicher User)
2. Beim Callback erkannt (expiresAt < now) und im negativen Lookup-Ergebnis implizit ignoriert

Ein periodisches `deleteMany({ where: { expiresAt: { lt: new Date() } } })` kann optional in einem Next.js `cron`-Handler ergänzt werden, ist aber nicht erforderlich für Korrektheit.

---

## Security Design

### userId-Isolation

```
                    ┌─────────────────────────────────────┐
                    │         LinkCallbackHandler          │
                    │                                      │
  OIDC Callback ──► │  state → SsoLinkingSession.userId   │──► SsoAccount.userId
                    │                                      │
                    │  ID-Token sub ─────────────────────► │──► SsoAccount.providerAccountId
                    │  (niemals für userId verwendet)      │
                    └─────────────────────────────────────┘
```

Die einzige Quelle für `userId` ist die serverseitig gespeicherte `LinkingSession`. Das ID-Token liefert ausschließlich `providerAccountId` (den `sub`-Claim). Diese Trennung verhindert Account-Hijacking auch wenn ein Angreifer das ID-Token manipuliert.

### PKCE S256 Berechnung

```
code_verifier = base64url(32 random bytes)     // 43 Zeichen
code_challenge = base64url(SHA-256(ASCII(code_verifier)))
```

Der `code_verifier` verlässt den Server nie direkt — er wird in der `SsoLinkingSession` gespeichert und beim Token-Exchange als POST-Parameter an den Provider gesendet. Der Provider verifiziert, dass `SHA-256(code_verifier) == code_challenge` aus dem ursprünglichen Authorization-Request.

### State-Token-Einmaligkeit

```
state = base64url(32 random bytes)   // 43 Zeichen, ≥256 Bit Entropie
```

- `@@unique` auf `SsoLinkingSession.state` verhindert Duplikate auf DB-Ebene
- Nach erfolgreichem oder fehlerhaftem Callback wird die Session sofort gelöscht
- Ein zweiter Callback-Versuch mit demselben state findet keine Session mehr → `sso-link-invalid-state`

---

## File Structure

```
src/
├── app/api/auth/sso/
│   ├── link-status/route.ts          (bereits vorhanden — keine Änderung)
│   ├── link/
│   │   ├── initiate/route.ts         (neu)
│   │   └── callback/route.ts         (neu)
│   └── unlink/route.ts               (neu)
│
├── components/auth/
│   ├── sso-linking-panel.tsx         (neu, ersetzt sso-status.tsx)
│   └── sso-status.tsx                (wird umbenannt → sso-linking-panel.tsx)
│
├── lib/services/
│   ├── sso-linking-service.ts        (neu — reine PKCE + OIDC-Logik)
│   └── log-service.ts                (ergänzt: 7 neue Aktionskonstanten)
│
prisma/
└── schema.prisma                     (ergänzt: SsoLinkingSession-Modell + User-Relation)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: LinkingSession-Erstellung ist vollständig und zeitlich begrenzt

*For any* authenticated userId, calling the link-initiation logic SHALL produce a `SsoLinkingSession` that contains a non-empty `state`, a non-empty `codeVerifier`, the correct `userId`, and an `expiresAt` that is strictly between `now()` and `now() + 15 minutes`. Calling the logic a second time for the same userId SHALL result in exactly one active session (Upsert-Idempotenz).

**Validates: Requirements 1.1, 1.2**

### Property 2: PKCE code_challenge-Berechnung

*For any* `code_verifier` string, `computeCodeChallenge(verifier)` SHALL produce a string that equals `base64url(SHA-256(ASCII(verifier)))`. Re-computing the same verifier SHALL always return the same challenge (Determinismus), and two different verifiers SHALL produce different challenges (Injektivität über den relevanten Eingaberaum).

**Validates: Requirements 1.3, 5.4**

### Property 3: Authorization-URL enthält alle PKCE/Security-Parameter

*For any* generated `state` and `code_challenge`, the constructed OIDC Authorization-URL SHALL contain `response_type=code`, `state`, `code_challenge`, and `code_challenge_method=S256` as query parameters, and the `redirect_uri` SHALL point to `/api/auth/sso/link/callback`.

**Validates: Requirements 1.3, 5.4**

### Property 4: userId stammt immer aus der LinkingSession

*For any* `SsoLinkingSession` with userId A and any ID-Token with an arbitrary `sub` claim (including a `sub` that could be mapped to a different userId), the resulting `SsoAccount.userId` SHALL equal A. The content of the ID-Token SHALL never influence which userId gets linked.

**Validates: Requirements 2.4, 5.1, 5.5**

### Property 5: SsoAccount-Upsert erzeugt genau einen Eintrag pro userId+provider

*For any* userId and `sub` value, after a successful link callback the database SHALL contain exactly one `SsoAccount` entry with `userId`, `provider = "authentik"`, and `providerAccountId = sub`. Calling the upsert again with the same `sub` but the same userId SHALL not create a second entry.

**Validates: Requirements 2.6**

### Property 6: State-Token-Einmaligkeit verhindert Replay-Angriffe

*For any* `SsoLinkingSession` that has been successfully consumed (Callback abgeschlossen, Session gelöscht), a subsequent Callback-Request with demselben `state`-Wert SHALL be rejected (keine aktive Session gefunden) and no `SsoAccount` change SHALL occur.

**Validates: Requirements 2.7, 5.3, 5.7**

### Property 7: Sub-Konflikt verhindert Account-Hijacking

*For any* `sub` value that is already associated with a different userId B in the `SsoAccount` table, a link attempt by userId A (A ≠ B) SHALL be rejected — no `SsoAccount` change for userId A SHALL occur, and userId B's association SHALL remain intact.

**Validates: Requirements 2.8**

### Property 8: Unlink entfernt alle SsoAccounts des Users

*For any* userId with one or more `SsoAccount` entries, calling the unlink handler SHALL result in zero `SsoAccount` entries for that userId in the database. The accounts of other users SHALL remain unaffected.

**Validates: Requirements 3.1**

### Property 9: Audit-Log-Vollständigkeit

*For any* completed linking or unlinking operation (Erfolg oder definierter Fehlerfall), there SHALL exist exactly one corresponding `AuditLog` entry with the correct `action` constant, the correct `actorId` (userId), and non-null `details` including provider and result/reason. The AuditLog entry SHALL be written before the redirect/response is returned.

**Validates: Requirements 2.10, 3.3, 5.6, 5.7**

### Property 10: SsoLinkingPanel zeigt für jeden API-Zustand die korrekte UI

*For any* response from `GET /api/auth/sso/link-status` (linked, unlinked, ssoConfigured=false, network error), the `SsoLinkingPanel` SHALL render a UI state that: (a) in the `linked` case shows the provider name and a visible unlink button, (b) in the `unlinked + ssoConfigured` case shows a visible link button, (c) in the `sso-not-configured` case shows no link button but an admin-hint message, and (d) in the error case shows an error message with a retry affordance.

**Validates: Requirements 4.1, 4.2, 4.3, 4.8, 4.9**


---

## Testing Strategy

### Unit Tests (Beispiel-basiert)

Folgende Szenarien werden als klassische Unit-Tests abgedeckt:

- `LinkInitiator` gibt 401 zurück wenn kein User in der Session
- `LinkInitiator` gibt 503 zurück wenn SSO nicht konfiguriert
- `LinkInitiator` gibt 500 zurück wenn der DB-Upsert fehlschlägt (kein Redirect)
- `LinkCallbackHandler` redirectet zu `?error=sso-link-denied` wenn Provider `error` sendet
- `LinkCallbackHandler` redirectet zu `?error=sso-link-failed` wenn Token-Exchange Timeout auftritt
- `LinkCallbackHandler` redirectet zu `?error=sso-link-failed` wenn sub-Claim fehlt
- `UnlinkHandler` gibt 401 zurück wenn nicht authentifiziert
- `UnlinkHandler` gibt 404 zurück wenn kein SsoAccount vorhanden
- `SsoLinkingPanel` zeigt korrekten Feedback-Text für `?success=sso-linked`
- `SsoLinkingPanel` zeigt korrekten Feedback-Text für jeden `?error=...`-Parameter
- `SsoLinkingPanel` bereinigt URL-Parameter nach dem Anzeigen der Meldung

### Property Tests (Universell quantifiziert)

Alle 10 Correctness Properties oben werden als Property-based Tests implementiert (min. 100 Iterationen je Property). Die Tests befinden sich in:

- `__tests__/sso-account-linking/sso-linking-service.property.test.ts` — Properties 1–3 (PKCE-Logik, Session-Erstellung)
- `__tests__/sso-account-linking/sso-callback.property.test.ts` — Properties 4–7 (Callback-Sicherheit, Upsert, Replay, Konflikt)
- `__tests__/sso-account-linking/sso-unlink.property.test.ts` — Property 8 (Unlink-Vollständigkeit)
- `__tests__/sso-account-linking/sso-audit-log.property.test.ts` — Property 9 (Audit-Log-Vollständigkeit)
- `__tests__/sso-account-linking/sso-linking-panel.property.test.ts` — Property 10 (UI-Zustandsabbildung)

Externe Abhängigkeiten (Prisma, OIDC-Provider) werden in allen Property-Tests gemockt, um 100+ Iterationen kostengünstig ausführen zu können.

### Integration Tests

- End-to-End-Smoke-Test für den vollständigen Link-Flow mit einem Mock-OIDC-Provider (1–2 Beispiele)
- Datenbankintegrations-Test: `SsoLinkingSession`-Upsert und Ablaufverhalten gegen eine Test-Datenbank
