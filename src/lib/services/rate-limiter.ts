import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function checkRateLimit(
  email: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  if (failedAttempts >= MAX_ATTEMPTS) {
    const oldestAttempt = await prisma.loginAttempt.findFirst({
      where: {
        email,
        success: false,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "asc" },
    });

    const retryAfter = oldestAttempt
      ? Math.ceil(
          (oldestAttempt.createdAt.getTime() +
            WINDOW_MINUTES * 60 * 1000 -
            Date.now()) /
            1000
        )
      : WINDOW_MINUTES * 60;

    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

export async function recordFailedAttempt(email: string): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email,
      success: false,
    },
  });
}

export async function resetAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: {
      email,
      success: false,
    },
  });
}
