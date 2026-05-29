/**
 * Auth Extension Types
 *
 * TypeScript interfaces and types for the extended authentication system:
 * Remember-Me, Passkey (WebAuthn/FIDO2), and SSO (OpenID Connect via Authentik).
 */

import type { AccountStatus } from "@/types/auth";

// ---------------------------------------------------------------------------
// Auth Method
// ---------------------------------------------------------------------------

/** Supported authentication methods */
export type AuthMethod = "credentials" | "passkey" | "sso";

// ---------------------------------------------------------------------------
// Extended JWT Payload
// ---------------------------------------------------------------------------

/** Extended JWT payload including auth method and remember-me flag */
export interface ExtendedJWTPayload {
  id: string;
  role: "ADMIN" | "USER";
  accountStatus: AccountStatus;
  rememberMe?: boolean;
  authMethod: AuthMethod;
}

// ---------------------------------------------------------------------------
// Passkey
// ---------------------------------------------------------------------------

/** Public-facing passkey information (for listing in UI) */
export interface PasskeyInfo {
  id: string;
  name: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// SSO Configuration
// ---------------------------------------------------------------------------

/** SSO/OIDC provider configuration loaded from environment variables */
export interface SsoConfig {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
}

// ---------------------------------------------------------------------------
// Environment Variable Types
// ---------------------------------------------------------------------------

/** WebAuthn environment variable keys */
export interface WebAuthnEnvVars {
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_RP_NAME: string;
  WEBAUTHN_ORIGIN: string;
}

/** SSO environment variable keys */
export interface SsoEnvVars {
  SSO_CLIENT_ID: string;
  SSO_CLIENT_SECRET: string;
  SSO_ISSUER_URL: string;
}

/** All auth-extension environment variables */
export interface AuthExtensionEnvVars extends WebAuthnEnvVars, SsoEnvVars {}
