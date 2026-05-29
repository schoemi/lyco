/**
 * Passkey Service
 *
 * Handles WebAuthn/FIDO2 passkey registration, authentication, and management.
 * Uses @simplewebauthn/server for cryptographic operations and Prisma for persistence.
 */

import {
  generateRegistrationOptions as generateRegOptions,
  generateAuthenticationOptions as generateAuthOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import type {
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { prisma } from "@/lib/prisma";
import { getWebAuthnConfig } from "@/lib/config/auth-env";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Challenge timeout in milliseconds */
const CHALLENGE_TIMEOUT_MS = 60_000;

/** Maximum number of passkeys per user */
const MAX_PASSKEYS_PER_USER = 10;

/** Supported COSE algorithm identifiers: ES256 (-7) and RS256 (-257) */
const SUPPORTED_ALGORITHMS: number[] = [-7, -257];

/** Minimum passkey name length */
const MIN_NAME_LENGTH = 1;

/** Maximum passkey name length */
const MAX_NAME_LENGTH = 64;

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Delete all expired WebAuthn challenges from the database.
 *
 * This implements lazy deletion — expired challenges are cleaned up whenever
 * new challenges are generated (registration or authentication). The expiresAt
 * index ensures efficient querying.
 */
export async function cleanupExpiredChallenges(): Promise<number> {
  const result = await prisma.webAuthnChallenge.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Generate WebAuthn registration options for a user.
 *
 * Creates a challenge with 60s timeout, stores it in the WebAuthnChallenge table,
 * and returns PublicKeyCredentialCreationOptionsJSON with only ES256 and RS256.
 */
export async function generateRegistrationOptions(
  userId: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Lazy cleanup of expired challenges to prevent database bloat
  await cleanupExpiredChallenges();

  // Enforce max passkey limit before generating options
  const count = await getPasskeyCount(userId);
  if (count >= MAX_PASSKEYS_PER_USER) {
    throw new Error(
      "Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey."
    );
  }

  // Get user info for the registration options
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error("Benutzer nicht gefunden");
  }

  // Get existing credentials to exclude (prevent re-registration)
  const existingPasskeys = await prisma.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const config = getWebAuthnConfig();

  const options = await generateRegOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userID: userId,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    timeout: CHALLENGE_TIMEOUT_MS,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: isoBase64URL.toBuffer(pk.credentialId),
      type: "public-key" as const,
      transports: pk.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: SUPPORTED_ALGORITHMS,
  });

  // Store challenge in database with expiry
  const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT_MS);
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      userId,
      type: "registration",
      expiresAt,
    },
  });

  return options;
}

/**
 * Verify a WebAuthn registration response and store the credential.
 *
 * Validates: challenge not expired, registration response valid,
 * algorithm is ES256 or RS256, name is 1–64 chars.
 */
export async function verifyRegistration(
  userId: string,
  credential: RegistrationResponseJSON,
  name: string
): Promise<{
  id: string;
  name: string;
  createdAt: Date;
}> {
  // Validate passkey name
  const trimmedName = name.trim();
  if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
    throw new Error(
      "Der Passkey-Name muss zwischen 1 und 64 Zeichen lang sein."
    );
  }

  // Enforce max passkey limit
  const count = await getPasskeyCount(userId);
  if (count >= MAX_PASSKEYS_PER_USER) {
    throw new Error(
      "Maximale Anzahl von 10 Passkeys erreicht. Bitte löschen Sie einen bestehenden Passkey."
    );
  }

  // Find and validate the challenge
  const storedChallenge = await prisma.webAuthnChallenge.findFirst({
    where: {
      userId,
      type: "registration",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!storedChallenge) {
    throw new Error(
      "Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut."
    );
  }

  if (new Date() > storedChallenge.expiresAt) {
    // Clean up expired challenge
    await prisma.webAuthnChallenge.delete({
      where: { id: storedChallenge.id },
    });
    throw new Error(
      "Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut."
    );
  }

  const config = getWebAuthnConfig();

  // Verify the registration response
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: storedChallenge.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    supportedAlgorithmIDs: SUPPORTED_ALGORITHMS,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey-Registrierung fehlgeschlagen.");
  }

  const { registrationInfo } = verification;

  // Validate algorithm is ES256 or RS256
  // The credentialPublicKey is COSE-encoded; we need to check the algorithm
  // from the attestation. SimpleWebAuthn validates this via supportedAlgorithmIDs,
  // but we double-check here for defense in depth.
  const credentialIdBase64 = isoBase64URL.fromBuffer(
    registrationInfo.credentialID
  );

  // Determine the algorithm from the COSE public key
  const algorithm = getAlgorithmFromPublicKey(registrationInfo.credentialPublicKey);
  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new Error(
      "Nicht unterstützter Algorithmus. Nur ES256 und RS256 werden akzeptiert."
    );
  }

  // Store the credential in the database
  const passkey = await prisma.passkey.create({
    data: {
      userId,
      credentialId: credentialIdBase64,
      publicKey: Buffer.from(registrationInfo.credentialPublicKey),
      counter: registrationInfo.counter,
      name: trimmedName,
      algorithm,
      transports: credential.response.transports ?? [],
    },
  });

  // Clean up the used challenge
  await prisma.webAuthnChallenge.delete({
    where: { id: storedChallenge.id },
  });

  return {
    id: passkey.id,
    name: passkey.name,
    createdAt: passkey.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/** Result of a successful passkey authentication */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  accountStatus: string;
  credentialId: string;
}

/**
 * Generate WebAuthn authentication options for discoverable credentials.
 *
 * Creates a challenge with 60s timeout, uses empty allowCredentials (discoverable),
 * stores challenge in WebAuthnChallenge table with userId=null and type "authentication".
 */
export async function generateAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  // Lazy cleanup of expired challenges to prevent database bloat
  await cleanupExpiredChallenges();

  const config = getWebAuthnConfig();

  const options = await generateAuthOptions({
    rpID: config.rpId,
    timeout: CHALLENGE_TIMEOUT_MS,
    allowCredentials: [],
    userVerification: "preferred",
  });

  // Store challenge in database with expiry (userId=null for authentication)
  const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT_MS);
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: options.challenge,
      userId: null,
      type: "authentication",
      expiresAt,
    },
  });

  return options;
}

/**
 * Verify a WebAuthn authentication assertion.
 *
 * Validates: credential not compromised, challenge not expired, assertion valid,
 * signature counter monotonically increasing. On counter violation, marks credential
 * as compromised and rejects.
 */
export async function verifyAuthentication(
  assertion: AuthenticationResponseJSON
): Promise<AuthenticatedUser> {
  // Extract credential ID from the assertion response
  const credentialIdBase64 = assertion.id;

  // Look up the credential by credentialId
  const credential = await prisma.passkey.findUnique({
    where: { credentialId: credentialIdBase64 },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          accountStatus: true,
        },
      },
    },
  });

  if (!credential) {
    throw new Error("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
  }

  // Check if credential is compromised — reject immediately
  if (credential.isCompromised) {
    throw new Error(
      "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
    );
  }

  // Find a valid (not expired) authentication challenge
  const storedChallenge = await prisma.webAuthnChallenge.findFirst({
    where: {
      type: "authentication",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!storedChallenge) {
    throw new Error(
      "Die Sicherheitsabfrage ist abgelaufen. Bitte starten Sie den Vorgang erneut."
    );
  }

  const config = getWebAuthnConfig();

  // Build the authenticator device object for verification
  const authenticator = {
    credentialPublicKey: new Uint8Array(credential.publicKey),
    credentialID: isoBase64URL.toBuffer(credential.credentialId),
    counter: credential.counter,
    transports: credential.transports as AuthenticatorTransportFuture[],
  };

  // Verify the authentication response
  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: storedChallenge.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpId,
    authenticator,
  });

  if (!verification.verified) {
    throw new Error("Passkey-Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
  }

  const { authenticationInfo } = verification;

  // Check signature counter monotonicity
  // If presented counter <= stored counter, mark as compromised and reject
  if (authenticationInfo.newCounter <= credential.counter && credential.counter > 0) {
    await prisma.passkey.update({
      where: { id: credential.id },
      data: { isCompromised: true },
    });
    throw new Error(
      "Sicherheitsproblem erkannt. Dieser Passkey wurde deaktiviert. Bitte registrieren Sie einen neuen Passkey."
    );
  }

  // Update stored counter on success
  await prisma.passkey.update({
    where: { id: credential.id },
    data: { counter: authenticationInfo.newCounter },
  });

  // Clean up the used challenge
  await prisma.webAuthnChallenge.delete({
    where: { id: storedChallenge.id },
  });

  return {
    id: credential.user.id,
    email: credential.user.email,
    name: credential.user.name,
    role: credential.user.role,
    accountStatus: credential.user.accountStatus,
    credentialId: credential.credentialId,
  };
}

// ---------------------------------------------------------------------------
// Management
// ---------------------------------------------------------------------------

/**
 * Get the number of passkeys registered for a user.
 */
export async function getPasskeyCount(userId: string): Promise<number> {
  return prisma.passkey.count({
    where: { userId },
  });
}

/**
 * List all passkeys belonging to a user.
 * Returns id, name, and createdAt for each passkey, ordered by newest first.
 */
export async function listPasskeys(userId: string): Promise<{
  id: string;
  name: string;
  createdAt: Date;
}[]> {
  return prisma.passkey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete a passkey by ID, verifying it belongs to the specified user.
 * Throws an error if the passkey doesn't exist or doesn't belong to the user.
 */
export async function deletePasskey(
  userId: string,
  passkeyId: string
): Promise<void> {
  const passkey = await prisma.passkey.findUnique({
    where: { id: passkeyId },
    select: { id: true, userId: true },
  });

  if (!passkey) {
    throw new Error("Passkey nicht gefunden");
  }

  if (passkey.userId !== userId) {
    throw new Error("Passkey gehört nicht zu diesem Benutzer");
  }

  await prisma.passkey.delete({
    where: { id: passkeyId },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the COSE algorithm identifier from a COSE-encoded public key.
 *
 * The algorithm is stored at COSE key label 3 in the CBOR map.
 * ES256 = -7, RS256 = -257
 */
function getAlgorithmFromPublicKey(publicKey: Uint8Array): number {
  // COSE keys are CBOR-encoded maps. The algorithm is at key 3.
  // We use the isoCBOR helper from @simplewebauthn/server to decode.
  const decoded = isoCBOR.decodeFirst(publicKey) as Map<number, unknown>;
  const alg = decoded.get(3);
  if (typeof alg !== "number") {
    throw new Error("Could not determine algorithm from credential public key");
  }
  return alg;
}

// Re-export types for consumers
export type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, AuthenticationResponseJSON, RegistrationResponseJSON };
