import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from "@/lib/services/rate-limiter";

const SALT_ROUNDS = 12;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validatePassword(
  password: string
): { valid: boolean; error?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`,
    };
  }
  return { valid: true };
}

export async function authorize(
  email: string,
  password: string
): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
} | null> {
  // 1. Check rate limit
  const rateLimit = await checkRateLimit(email);
  if (!rateLimit.allowed) {
    return null;
  }

  // 2. Look up user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await recordFailedAttempt(email);
    return null;
  }

  // 3. Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    await recordFailedAttempt(email);
    return null;
  }

  // 4. Success: reset rate limit attempts, return user
  await resetAttempts(email);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
