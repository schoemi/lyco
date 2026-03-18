import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { prisma } from "@/lib/prisma";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.GENIUS_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("GENIUS_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("GENIUS_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }
  return key;
}

/**
 * Encrypts an API key using AES-256-GCM.
 * Output format: Base64(IV + AuthTag + Ciphertext)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: IV (12) + AuthTag (16) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts an API key encrypted with encryptApiKey.
 * Expects Base64(IV + AuthTag + Ciphertext).
 */
export function decryptApiKey(encrypted: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Reads and decrypts the Genius API key for a given user from the database.
 * Throws if the user has no API key stored.
 */
export async function getUserApiKey(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geniusApiKeyEncrypted: true },
  });

  if (!user?.geniusApiKeyEncrypted) {
    throw new Error(
      "Kein Genius-API-Schlüssel hinterlegt. Bitte in den Profileinstellungen konfigurieren."
    );
  }

  return decryptApiKey(user.geniusApiKeyEncrypted);
}

/**
 * Masks an API key, showing only the last 4 characters.
 * E.g. "mySecretKey1234" → "••••••••••1234"
 */
export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 4) {
    return plaintext;
  }
  const visible = plaintext.slice(-4);
  const masked = "•".repeat(plaintext.length - 4);
  return masked + visible;
}
