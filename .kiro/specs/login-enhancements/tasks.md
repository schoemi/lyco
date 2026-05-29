# Implementation Plan: Login Enhancements

## Overview

Extend the existing Lyco authentication system with Remember-Me sessions, Passkey (WebAuthn/FIDO2) authentication, and Single Sign-On via Authentik (OpenID Connect). Implementation uses NextAuth v5 provider extension, `@simplewebauthn/server` for WebAuthn, and the built-in OIDC provider for Authentik. All new functionality is additive — the existing credentials-based auth remains unchanged.

## Tasks

- [x] 1. Database schema and core types
  - [x] 1.1 Add Prisma models for Passkey, SsoAccount, and WebAuthnChallenge
    - Add `Passkey` model with fields: id, userId, credentialId (unique), publicKey (Bytes), counter, name, algorithm, transports, isCompromised, createdAt
    - Add `SsoAccount` model with fields: id, userId, provider, providerAccountId, createdAt; unique constraint on [provider, providerAccountId]
    - Add `WebAuthnChallenge` model with fields: id, challenge (unique), userId (nullable), type, expiresAt, createdAt
    - Add `passkeys` and `ssoAccounts` relations to the existing `User` model
    - Run `npx prisma migrate dev` to generate and apply migration
    - _Requirements: 2.3, 4.6, 4.7_

  - [x] 1.2 Define TypeScript interfaces and types for auth extension
    - Create `src/lib/types/auth-extensions.ts` with `ExtendedJWTPayload`, `PasskeyInfo`, `SsoConfig` interfaces
    - Define `AuthMethod` type union: `"credentials" | "passkey" | "sso"`
    - Add environment variable types for `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_ISSUER_URL`
    - _Requirements: 1.2, 1.3, 4.10_

  - [x] 1.3 Add environment variables to `.env.example` and validation
    - Add WebAuthn config vars: `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`, `WEBAUTHN_ORIGIN`
    - Add SSO config vars: `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_ISSUER_URL`
    - Add runtime validation that WebAuthn vars are present for passkey features
    - _Requirements: 4.10, 2.2_

- [x] 2. Remember-Me functionality
  - [x] 2.1 Extend NextAuth JWT callback for dynamic session duration
    - Modify `src/lib/auth.ts` JWT callback to check for `rememberMe` flag in the sign-in payload
    - When `rememberMe` is true, set token expiry to 30 days from now
    - When `rememberMe` is false or absent, keep existing 24-hour expiry
    - Implement rolling session: on each request with an active remember-me session, update token expiry to current time + 30 days
    - Add `authMethod` field to the JWT payload
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 2.2 Extend NextAuth session callback and cookie configuration
    - Propagate `authMethod` from JWT to client session object
    - Ensure session cookie uses httpOnly, secure (production), sameSite=lax attributes
    - On session invalidation (logout, admin action), fully remove the session cookie
    - _Requirements: 1.5, 1.6_

  - [x] 2.3 Implement suspended account session invalidation
    - In the JWT callback or middleware, check user account status on each request
    - If account status is SUSPENDED, deny the request and invalidate the session
    - Redirect to login page with appropriate error message
    - _Requirements: 1.8_

  - [x] 2.4 Add RememberMeCheckbox UI component to login page
    - Create `RememberMeCheckbox` component (unchecked by default)
    - Pass `rememberMe` flag through the credentials sign-in call
    - Add expired session redirect with informational message
    - _Requirements: 1.1, 1.7_

  - [x] 2.5 Write property tests for Remember-Me sessions
    - **Property 1: Session duration determined by rememberMe flag**
    - **Property 2: Rolling session extends expiry on each request**
    - **Property 3: Suspended account invalidates active session**
    - **Property 18: Session invalidation removes cookie**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.6, 1.8**

- [x] 3. Checkpoint - Remember-Me complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Passkey registration
  - [x] 4.1 Implement PasskeyService - registration methods
    - Create `src/lib/services/passkey-service.ts`
    - Implement `generateRegistrationOptions(userId)`: create challenge with 60s timeout, store in `WebAuthnChallenge` table, return `PublicKeyCredentialCreationOptionsJSON` with supported algorithms (ES256, RS256 only)
    - Implement `verifyRegistration(userId, credential, name)`: validate challenge not expired, verify registration response via `@simplewebauthn/server`, validate algorithm is ES256 or RS256, validate name is 1–64 chars, store credential in `Passkey` table
    - Implement `getPasskeyCount(userId)`: return count, enforce max 10 limit
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.9, 6.1_

  - [x] 4.2 Implement PasskeyService - management methods
    - Implement `listPasskeys(userId)`: return passkey list with id, name, createdAt
    - Implement `deletePasskey(userId, passkeyId)`: verify ownership, remove from database
    - _Requirements: 2.6, 2.7_

  - [x] 4.3 Create passkey registration API routes
    - Create `POST /api/auth/passkey/register/options` — authenticated, calls `generateRegistrationOptions`
    - Create `POST /api/auth/passkey/register/verify` — authenticated, calls `verifyRegistration`
    - Create `GET /api/auth/passkey/credentials` — authenticated, calls `listPasskeys`
    - Create `DELETE /api/auth/passkey/credentials/[id]` — authenticated, calls `deletePasskey`
    - Apply rate limiting to registration endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [x] 4.4 Create PasskeyManager UI component
    - Create `PasskeyManager` component for account settings page
    - Display list of registered passkeys with name and creation date
    - Add "Register new passkey" button with name input (1–64 chars validation)
    - Add delete button per passkey with confirmation
    - Show error messages for: timeout, user cancel, unsupported device, limit reached, invalid name
    - Conditionally render based on WebAuthn browser support
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 4.5 Write property tests for passkey registration
    - **Property 4: WebAuthn challenge expiry**
    - **Property 5: Passkey registration stores complete credential data**
    - **Property 6: Maximum passkeys per user invariant**
    - **Property 7: Passkey deletion removes credential**
    - **Property 11: Only ES256 and RS256 algorithms accepted**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.7, 2.9, 6.1**

- [x] 5. Passkey authentication
  - [x] 5.1 Implement PasskeyService - authentication methods
    - Implement `generateAuthenticationOptions()`: create challenge with 60s timeout, use discoverable credentials (empty allowCredentials), store in `WebAuthnChallenge` table
    - Implement `verifyAuthentication(assertion)`: validate challenge not expired, verify assertion via `@simplewebauthn/server`, check signature counter monotonicity, reject if credential is compromised, update stored counter on success
    - On counter violation: mark credential as `isCompromised = true`, reject authentication
    - _Requirements: 3.2, 3.3, 3.8, 3.10, 6.2, 6.7_

  - [x] 5.2 Create passkey authentication API routes
    - Create `POST /api/auth/passkey/authenticate/options` — public, calls `generateAuthenticationOptions`
    - Create `POST /api/auth/passkey/authenticate/verify` — public, calls `verifyAuthentication`, creates JWT session (24h default)
    - Apply rate limiting: 5 failed attempts per IP within 15 minutes
    - Log all attempts (success and failure) to audit log with method, user ID, IP, credential ID
    - _Requirements: 3.2, 3.3, 3.7, 3.9, 6.3, 6.4_

  - [x] 5.3 Add PasskeyLoginButton UI component to login page
    - Create `PasskeyLoginButton` component
    - Conditionally render only when browser supports WebAuthn (`PublicKeyCredential` available)
    - On click: request authentication options, trigger browser WebAuthn prompt, submit assertion to verify endpoint
    - Handle errors: expired challenge (prompt restart), invalid assertion (allow retry), rate limited (show wait message)
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [x] 5.4 Write property tests for passkey authentication
    - **Property 8: Signature counter monotonicity**
    - **Property 9: Compromised credentials permanently rejected**
    - **Property 10: Rate limiting on passkey authentication**
    - **Validates: Requirements 3.8, 3.9, 6.2, 6.4, 6.7**

- [x] 6. Checkpoint - Passkey complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. SSO via Authentik (OpenID Connect)
  - [x] 7.1 Configure NextAuth OIDC provider for Authentik
    - In `src/lib/auth.ts`, conditionally add OIDC provider when `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET`, `SSO_ISSUER_URL` are all present
    - Configure provider with PKCE (S256 method), state parameter, scope "openid email profile"
    - Set token exchange timeout to 10 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.10, 6.6_

  - [x] 7.2 Implement SSO account matching and creation logic
    - In NextAuth `signIn` callback: on OIDC sign-in, extract email from ID token
    - If account with email exists and status is ACTIVE: link via `SsoAccount` record, allow sign-in
    - If account with email exists but status is SUSPENDED or PENDING: deny sign-in with appropriate message
    - If no account exists and auto-create is enabled: create new User (role USER, status ACTIVE) + SsoAccount, allow sign-in
    - If no account exists and auto-create is disabled: deny sign-in
    - _Requirements: 4.6, 4.7, 4.8, 5.2, 5.3, 5.5, 5.6_

  - [x] 7.3 Implement ID token validation and error handling
    - Validate issuer matches configured `SSO_ISSUER_URL`
    - Validate audience matches configured `SSO_CLIENT_ID`
    - Validate token expiry (exp not in the past)
    - Validate state parameter matches originally sent state
    - On any validation failure: redirect to login with error message
    - On token exchange failure or timeout: redirect to login with SSO communication error
    - _Requirements: 4.4, 4.5, 4.9, 6.5_

  - [x] 7.4 Add SsoLoginButton UI component to login page
    - Create `SsoLoginButton` component
    - Conditionally render only when SSO configuration is complete (check via API or server component)
    - On click: initiate NextAuth OIDC sign-in flow
    - _Requirements: 4.1_

  - [x] 7.5 Add SsoStatus component to account settings
    - Create `SsoStatus` component showing whether account is linked to SSO
    - Display SSO provider name if linked
    - _Requirements: 5.4_

  - [x] 7.6 Implement SSO logout handling
    - On logout for SSO-authenticated users: end local JWT session, remove session cookie
    - _Requirements: 4.11_

  - [x] 7.7 Write property tests for SSO authentication
    - **Property 12: ID token validation rejects invalid tokens**
    - **Property 13: SSO account matching and creation**
    - **Property 14: Non-ACTIVE accounts denied SSO login**
    - **Property 15: State parameter validation**
    - **Property 16: PKCE parameters in authorization request**
    - **Validates: Requirements 4.2, 4.5, 4.6, 4.7, 4.8, 4.9, 5.2, 5.3, 5.5, 5.6, 6.5, 6.6**

- [x] 8. Checkpoint - SSO complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. SSO admin settings and audit logging
  - [x] 9.1 Implement SSO auto-create admin setting
    - Add `sso-auto-create-accounts` key to existing `SystemSetting` key-value store (default: false)
    - Create `GET /api/settings/sso` — admin only, returns current auto-create setting
    - Create `PUT /api/settings/sso` — admin only, updates auto-create setting
    - Enforce ADMIN role check on both endpoints; deny all other roles
    - _Requirements: 5.1_

  - [x] 9.2 Add SsoAdminSettings UI component
    - Create `SsoAdminSettings` component for admin settings page
    - Toggle for "Automatische Kontoerstellung bei SSO" (default off)
    - Only visible/accessible to ADMIN users
    - _Requirements: 5.1_

  - [x] 9.3 Extend audit logging for all authentication methods
    - Ensure every authentication attempt (credentials, passkey, SSO) creates an audit log entry
    - Log entry must contain: authentication method, user ID (if known), IP address, timestamp, success/failure
    - For passkey: also log credential ID
    - Extend existing `LogService` to support new auth method types
    - _Requirements: 3.7, 6.3_

  - [x] 9.4 Write property tests for audit logging and admin settings
    - **Property 17: Audit log for every authentication attempt**
    - **Property 19: Admin-only access to SSO auto-create setting**
    - **Validates: Requirements 3.7, 5.1, 6.3**

- [x] 10. Integration and wiring
  - [x] 10.1 Wire login page with all authentication methods
    - Integrate `RememberMeCheckbox`, `PasskeyLoginButton`, and `SsoLoginButton` into the existing login page
    - Ensure proper layout and conditional rendering
    - Verify all three methods work independently and don't interfere with each other
    - _Requirements: 1.1, 3.1, 4.1_

  - [x] 10.2 Wire account settings page with passkey and SSO components
    - Integrate `PasskeyManager` and `SsoStatus` into account settings
    - Ensure proper authentication guards (user must be logged in)
    - _Requirements: 2.1, 2.6, 5.4_

  - [x] 10.3 Wire admin settings page with SSO admin component
    - Integrate `SsoAdminSettings` into admin settings page
    - Ensure ADMIN role guard
    - _Requirements: 5.1_

  - [x] 10.4 Add challenge cleanup mechanism
    - Implement lazy deletion of expired `WebAuthnChallenge` records on access
    - Add index on `expiresAt` for efficient cleanup queries
    - _Requirements: 2.2, 3.2_

  - [x] 10.5 Write integration tests for end-to-end flows
    - Test passkey registration flow with mocked WebAuthn
    - Test passkey authentication flow with mocked WebAuthn
    - Test SSO login flow with mocked Authentik responses
    - Test remember-me session persistence
    - _Requirements: 1.2, 2.3, 3.3, 4.6_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major feature area
- Property tests validate universal correctness properties defined in the design (19 total)
- Unit tests validate specific examples and edge cases
- The existing credentials-based authentication must remain fully functional throughout
- WebAuthn operations use `@simplewebauthn/server` v11+ for server-side verification
- SSO is conditionally enabled based on environment variables — no SSO config means no SSO UI

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2", "5.3"] },
    { "id": 9, "tasks": ["5.4"] },
    { "id": 10, "tasks": ["7.1"] },
    { "id": 11, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 12, "tasks": ["7.7"] },
    { "id": 13, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 14, "tasks": ["9.4"] },
    { "id": 15, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 16, "tasks": ["10.5"] }
  ]
}
```
