# Implementation Plan: SSO Account Linking

## Overview

Implementiert den manuellen SSO-Account-Linking-Flow für einen eingeloggten Lyco-User. Der Flow umfasst: Datenbankschema-Erweiterung, PKCE-Logik in einem dedizierten Service, drei neue API-Endpunkte (initiate, callback, unlink), eine neue React-Komponente (`SsoLinkingPanel`) sowie Audit-Log-Konstanten. Der bestehende NextAuth-Login-Flow bleibt vollständig unberührt.

## Tasks

- [x] 1. Datenbankschema und Audit-Log-Konstanten vorbereiten
  - [x] 1.1 `SsoLinkingSession`-Modell in `prisma/schema.prisma` ergänzen
    - Felder: `id`, `userId` (@unique), `state` (@unique), `codeVerifier`, `expiresAt`, `createdAt`
    - Relation `user User @relation(...)` mit `onDelete: Cascade`
    - Indizes: `@@index([state])`, `@@index([expiresAt])`
    - `@@map("sso_linking_sessions")`
    - `User`-Modell um `ssoLinkingSessions SsoLinkingSession[]` ergänzen
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Prisma-Migration erstellen und Client generieren
    - `npx prisma migrate dev --name add_sso_linking_session`
    - _Requirements: 1.1, 1.2_
  - [x] 1.3 Neue Audit-Log-Konstanten in `src/lib/services/log-service.ts` ergänzen
    - `SSO_LINK_INITIATED`, `SSO_LINK_SUCCESS`, `SSO_LINK_FAILED`, `SSO_LINK_DENIED`, `SSO_LINK_CONFLICT`, `SSO_LINK_STATE_REPLAY`, `SSO_UNLINK_SUCCESS`
    - _Requirements: 2.10, 3.3, 5.7_

- [x] 2. SSO-Linking-Service implementieren
  - [x] 2.1 Datei `src/lib/services/sso-linking-service.ts` erstellen
    - `generateState(): string` — 32 Bytes via `crypto.getRandomValues`, base64url-encodiert (≥256 Bit)
    - `generateCodeVerifier(): string` — 32 Bytes base64url (43 Zeichen, PKCE-konform)
    - `computeCodeChallenge(verifier: string): Promise<string>` — `BASE64URL(SHA-256(ASCII(verifier)))`
    - `discoverAuthorizationEndpoint(issuerUrl: string): Promise<string>` — OIDC Discovery via `/.well-known/openid-configuration`
    - `exchangeCodeForToken(params): Promise<{ idToken: string } | { error: string }>` — Token-Exchange mit 10s AbortSignal-Timeout
    - `verifyIdToken(idToken: string, issuerUrl: string): Promise<{ sub: string; ... } | null>` — JWKS-Verifikation
    - _Requirements: 1.1, 1.3, 2.4, 5.2, 5.4, 5.5, 5.6_
  - [x] 2.2 Property-Test für `generateState` / `generateCodeVerifier` / `computeCodeChallenge`
    - **Property 2: PKCE code_challenge-Berechnung** — Determinismus und Injektivität
    - **Validates: Requirements 1.3, 5.4**
    - Datei: `__tests__/sso-account-linking/sso-linking-service.property.test.ts`
  - [x] 2.3 Property-Test für Session-Erstellung (Upsert-Idempotenz)
    - **Property 1: LinkingSession-Erstellung ist vollständig und zeitlich begrenzt**
    - **Validates: Requirements 1.1, 1.2**
    - Datei: `__tests__/sso-account-linking/sso-linking-service.property.test.ts`
  - [x] 2.4 Property-Test für Authorization-URL-Konstruktion
    - **Property 3: Authorization-URL enthält alle PKCE/Security-Parameter**
    - **Validates: Requirements 1.3, 5.4**
    - Datei: `__tests__/sso-account-linking/sso-linking-service.property.test.ts`

- [x] 3. `LinkInitiator` — `GET /api/auth/sso/link/initiate`
  - [x] 3.1 Datei `src/app/api/auth/sso/link/initiate/route.ts` erstellen
    - Auth-Check → 401 wenn kein User in der Session
    - SSO-Config-Check (`getSsoConfig()`) → 503 wenn nicht konfiguriert
    - OIDC Discovery via `discoverAuthorizationEndpoint`
    - `generateState()` + `generateCodeVerifier()` + `computeCodeChallenge()`
    - `prisma.ssoLinkingSession.upsert({ where: { userId }, ... expiresAt: now+15min })` → 500 bei DB-Fehler, kein Redirect
    - `302`-Redirect zur Authorization-URL mit `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.2, 5.4_
  - [x] 3.2 Unit-Tests für `LinkInitiator`
    - 401 wenn kein User in der Session
    - 503 wenn SSO nicht konfiguriert
    - 500 wenn DB-Upsert fehlschlägt (kein Redirect)
    - _Requirements: 1.4, 1.5, 1.6_

- [x] 4. Checkpoint — Linking-Initiierung testen
  - Sicherstellen, dass alle Tests in Schritt 2 und 3 grün sind. Bei Fragen den User ansprechen.

- [x] 5. `LinkCallbackHandler` — `GET /api/auth/sso/link/callback`
  - [x] 5.1 Datei `src/app/api/auth/sso/link/callback/route.ts` erstellen
    - Provider-`error`-Parameter abfangen → Session löschen → `logAudit(SSO_LINK_DENIED)` → redirect zu `/profile?error=sso-link-denied`
    - State validieren: `prisma.ssoLinkingSession.findFirst({ where: { state, expiresAt: { gt: new Date() } } })` → keine Session → redirect zu `/profile?error=sso-link-invalid-state`
    - State-Replay erkennen: Session nicht gefunden nach vorherigem Verbrauch → `logAudit(SSO_LINK_STATE_REPLAY)`
    - Token-Exchange via `exchangeCodeForToken` (10s Timeout) → Fehler/Timeout → Session löschen → `logAudit(SSO_LINK_FAILED)` → redirect zu `/profile?error=sso-link-failed`
    - ID-Token via `verifyIdToken` prüfen, `sub` extrahieren → leer/null → Session löschen → `logAudit(SSO_LINK_FAILED)` → redirect zu `/profile?error=sso-link-failed`
    - Conflict-Check: `prisma.ssoAccount.findUnique({ where: { provider_providerAccountId: { provider: "authentik", providerAccountId: sub } } })` → anderer User → Session löschen → `logAudit(SSO_LINK_CONFLICT)` → redirect zu `/profile?error=sso-already-linked`
    - `userId` ausschließlich aus `session.userId` (nicht aus ID-Token) → `prisma.ssoAccount.upsert(...)`
    - Session löschen → `logAudit(SSO_LINK_SUCCESS)` → redirect zu `/profile?success=sso-linked`
    - _Requirements: 2.1–2.10, 5.1–5.7_
  - [x] 5.2 Property-Test: userId stammt immer aus der LinkingSession
    - **Property 4: userId stammt immer aus der LinkingSession**
    - **Validates: Requirements 2.4, 5.1, 5.5**
    - Datei: `__tests__/sso-account-linking/sso-callback.property.test.ts`
  - [x] 5.3 Property-Test: SsoAccount-Upsert erzeugt genau einen Eintrag
    - **Property 5: SsoAccount-Upsert erzeugt genau einen Eintrag pro userId+provider**
    - **Validates: Requirements 2.6**
    - Datei: `__tests__/sso-account-linking/sso-callback.property.test.ts`
  - [x] 5.4 Property-Test: State-Token-Einmaligkeit verhindert Replay-Angriffe
    - **Property 6: State-Token-Einmaligkeit verhindert Replay-Angriffe**
    - **Validates: Requirements 2.7, 5.3, 5.7**
    - Datei: `__tests__/sso-account-linking/sso-callback.property.test.ts`
  - [x] 5.5 Property-Test: Sub-Konflikt verhindert Account-Hijacking
    - **Property 7: Sub-Konflikt verhindert Account-Hijacking**
    - **Validates: Requirements 2.8**
    - Datei: `__tests__/sso-account-linking/sso-callback.property.test.ts`
  - [x] 5.6 Unit-Tests für `LinkCallbackHandler`-Fehlerpfade
    - Redirect zu `?error=sso-link-denied` wenn Provider `error` sendet
    - Redirect zu `?error=sso-link-failed` wenn Token-Exchange Timeout auftritt
    - Redirect zu `?error=sso-link-failed` wenn `sub`-Claim fehlt
    - _Requirements: 2.3, 2.5, 2.9_

- [x] 6. `UnlinkHandler` — `DELETE /api/auth/sso/unlink`
  - [x] 6.1 Datei `src/app/api/auth/sso/unlink/route.ts` erstellen
    - Auth-Check → 401
    - `prisma.ssoAccount.count({ where: { userId } })` → 0 → 404
    - `prisma.ssoAccount.deleteMany({ where: { userId } })` → DB-Fehler → 500
    - `logAudit(SSO_UNLINK_SUCCESS, { userId, providers: [...] })`
    - `200 { unlinked: true }`
    - _Requirements: 3.1–3.6_
  - [x] 6.2 Property-Test: Unlink entfernt alle SsoAccounts des Users
    - **Property 8: Unlink entfernt alle SsoAccounts des Users**
    - **Validates: Requirements 3.1**
    - Datei: `__tests__/sso-account-linking/sso-unlink.property.test.ts`
  - [x] 6.3 Unit-Tests für `UnlinkHandler`
    - 401 wenn nicht authentifiziert
    - 404 wenn kein SsoAccount vorhanden
    - _Requirements: 3.4, 3.5_

- [x] 7. Checkpoint — Backend vollständig testen
  - Sicherstellen, dass alle Tests in Schritten 5 und 6 grün sind. Bei Fragen den User ansprechen.

- [x] 8. Audit-Log-Property-Test
  - [x] 8.1 Property-Test: Audit-Log-Vollständigkeit
    - **Property 9: Audit-Log-Vollständigkeit**
    - **Validates: Requirements 2.10, 3.3, 5.6, 5.7**
    - Für jede abgeschlossene Linking-/Unlinking-Operation (Erfolg + alle Fehlerpfade) existiert genau ein AuditLog-Eintrag mit korrekter `action`, `actorId` und `details`
    - Datei: `__tests__/sso-account-linking/sso-audit-log.property.test.ts`

- [x] 9. `SsoLinkingPanel` — React Client Component
  - [x] 9.1 `src/components/auth/sso-status.tsx` umbenennen zu `src/components/auth/sso-linking-panel.tsx`
    - Export von `SsoStatus` auf `SsoLinkingPanel` ändern
    - `src/app/(app)/profile/page.tsx` Import aktualisieren
    - _Requirements: 4.1_
  - [x] 9.2 `SsoLinkingPanel` vollständig implementieren in `sso-linking-panel.tsx`
    - Zustandstypen: `loading | error | linked | unlinked | sso-not-configured`
    - Mount → fetch `GET /api/auth/sso/link-status` → Zustand setzen; `ssoConfigured`-Flag aus Response auswerten
    - `linked`-Zustand: Provider-Name + „Verknüpfung aufheben"-Button anzeigen
    - `unlinked + ssoConfigured`-Zustand: „Mit SSO verknüpfen"-Button (`window.location.href = "/api/auth/sso/link/initiate"`)
    - `sso-not-configured`-Zustand: kein Link-Button, Admin-Hinweis
    - `error`-Zustand: Fehlermeldung + Retry-Button
    - URL-Params (`?success=sso-linked`, `?error=sso-link-*`) beim Mount auswerten, Feedback anzeigen, Status neu laden, URL via `router.replace` bereinigen
    - Unlink-Button: `window.confirm(...)` → `DELETE /api/auth/sso/unlink` → Status neu laden
    - _Requirements: 4.1–4.9_
  - [x] 9.3 `/api/auth/sso/link-status`-Endpunkt um `ssoConfigured`-Feld erweitern
    - `getSsoConfig()` importieren, `ssoConfigured: boolean` zum Response-JSON hinzufügen
    - _Requirements: 4.8_
  - [x] 9.4 Property-Test: SsoLinkingPanel zeigt für jeden API-Zustand die korrekte UI
    - **Property 10: SsoLinkingPanel zeigt für jeden API-Zustand die korrekte UI**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.8, 4.9**
    - Datei: `__tests__/sso-account-linking/sso-linking-panel.property.test.ts`
  - [x] 9.5 Unit-Tests für `SsoLinkingPanel`
    - Korrekter Feedback-Text für `?success=sso-linked`
    - Korrekter Feedback-Text für jeden `?error=...`-Parameter
    - URL-Parameter werden nach Anzeige bereinigt
    - _Requirements: 4.7_

- [x] 10. Finale Integration und Checkpoint
  - [x] 10.1 Sicherstellen, dass `profile/page.tsx` den `SsoLinkingPanel` korrekt einbindet
    - Import-Pfad prüfen, keine doppelten SSO-Komponenten auf der Seite
    - _Requirements: 4.1_
  - [x] 10.2 Finaler Checkpoint — alle Tests grün
    - Sicherstellen, dass alle Tests (Unit + Property) grün sind. Bei Fragen den User ansprechen.

## Notes

- Tasks mit `*` sind optional und können für einen schnelleren MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Nachvollziehbarkeit
- Checkpoints in Schritt 4, 7 und 10.2 sichern inkrementelle Validierung
- Property-Tests verwenden min. 100 Iterationen und mocken alle externen Abhängigkeiten (Prisma, OIDC-Provider)
- Die `userId` im Callback stammt **immer** aus der `SsoLinkingSession` — niemals aus dem ID-Token (Anti-Hijacking-Invariante, Property 4)
- Bestehende Datei `sso-status.tsx` wird umbenannt (Task 9.1) — keine neue Datei parallel anlegen

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "8.1"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] },
    { "id": 9, "tasks": ["9.4", "9.5", "10.1"] },
    { "id": 10, "tasks": ["10.2"] }
  ]
}
```
