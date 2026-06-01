/**
 * Runtime validation and access for WebAuthn and SSO environment variables.
 *
 * WebAuthn vars are required when passkey features are used.
 * SSO vars are optional — SSO is only active when all three are present.
 */

export interface WebAuthnConfig {
  rpId: string;
  rpName: string;
  origin: string;
}

export interface SsoEnvConfig {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
}

/**
 * Returns the WebAuthn configuration from environment variables.
 * Throws if any required variable is missing — call this only when
 * passkey features are actually used.
 */
export function getWebAuthnConfig(): WebAuthnConfig {
  const rpId = process.env.WEBAUTHN_RP_ID;
  const rpName = process.env.WEBAUTHN_RP_NAME;
  const origin = process.env.WEBAUTHN_ORIGIN;

  const missing: string[] = [];
  if (!rpId) missing.push("WEBAUTHN_RP_ID");
  if (!rpName) missing.push("WEBAUTHN_RP_NAME");
  if (!origin) missing.push("WEBAUTHN_ORIGIN");

  if (missing.length > 0) {
    throw new Error(
      `Missing required WebAuthn environment variable(s): ${missing.join(", ")}. ` +
        "These must be set to use passkey features."
    );
  }

  return { rpId: rpId!, rpName: rpName!, origin: origin! };
}

/**
 * Returns the SSO configuration if all required variables are present.
 * Returns `null` if SSO is not configured (any variable missing).
 * This allows SSO to be conditionally enabled.
 */
export function getSsoConfig(): SsoEnvConfig | null {
  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const issuerUrl = process.env.SSO_ISSUER_URL;

  if (!clientId || !clientSecret || !issuerUrl) {
    return null;
  }

  return { clientId, clientSecret, issuerUrl };
}

/**
 * Returns true if all SSO environment variables are configured.
 */
export function isSsoConfigured(): boolean {
  return getSsoConfig() !== null;
}
