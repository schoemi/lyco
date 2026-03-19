import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
} from "@/lib/services/auth-service";
import { sendPasswordResetEmail } from "@/lib/services/email-service";

const RESET_REQUEST_LIMIT = 3;
const RESET_VALIDATION_LIMIT = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const TOKEN_EXPIRY_MINUTES = 60;

/**
 * Generate a cryptographically secure token (32 bytes, hex encoded).
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a plaintext token using SHA-256.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Request a password reset for the given email.
 * Always returns void (same response) to prevent email enumeration.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // 1. Check rate limit (3 requests / 15 min per email)
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  );
  const recentAttempts = await prisma.passwordResetAttempt.count({
    where: {
      email,
      type: "request",
      createdAt: { gt: windowStart },
    },
  });

  if (recentAttempts >= RESET_REQUEST_LIMIT) {
    throw new Error(
      "Zu viele Anfragen. Bitte warte einige Minuten und versuche es erneut."
    );
  }

  // Always record the attempt
  await prisma.passwordResetAttempt.create({
    data: { email, type: "request" },
  });

  // 2. Find user by email
  const user = await prisma.user.findUnique({ where: { email } });

  // 3. If user doesn't exist, do nothing (prevent email enumeration)
  if (!user) {
    return;
  }

  // 4. Invalidate old tokens (set usedAt on all unused tokens)
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  // 5. Generate new token
  const plainToken = generateToken();
  const hashedToken = hashToken(plainToken);

  // 6. Save hashed token with 60 min expiry
  await prisma.passwordResetToken.create({
    data: {
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  // 7. Send email with plaintext token
  await sendPasswordResetEmail(user.email, plainToken);
}

/**
 * Reset the password using a token.
 * Validates the token, checks expiry/usage, validates password, and updates.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  // 1. Hash the token to look it up
  const hashedToken = hashToken(token);

  // 2. Check rate limit (5 attempts / 15 min) using the hashed token as identifier
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  );
  const recentAttempts = await prisma.passwordResetAttempt.count({
    where: {
      email: hashedToken,
      type: "validation",
      createdAt: { gt: windowStart },
    },
  });

  if (recentAttempts >= RESET_VALIDATION_LIMIT) {
    throw new Error("Zu viele Versuche. Bitte warte einige Minuten.");
  }

  // Record the validation attempt
  await prisma.passwordResetAttempt.create({
    data: { email: hashedToken, type: "validation" },
  });

  // 3. Look up token in DB
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!resetToken) {
    throw new Error("Ungültiger oder abgelaufener Rücksetzungslink.");
  }

  // 4. Check if already used
  if (resetToken.usedAt !== null) {
    throw new Error("Dieser Rücksetzungslink wurde bereits verwendet.");
  }

  // 5. Check if expired
  if (resetToken.expiresAt <= new Date()) {
    throw new Error(
      "Der Rücksetzungslink ist abgelaufen. Bitte fordere einen neuen Link an."
    );
  }

  // 6. Validate passwords match
  if (newPassword !== confirmPassword) {
    throw new Error("Passwörter stimmen nicht überein.");
  }

  // 7. Validate password strength
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 8. Hash password with bcrypt and save to User model
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  // 9. Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });
}
