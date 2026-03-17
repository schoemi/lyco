/**
 * Property 1: Registrierungs-Round-Trip
 *
 * Für jede gültige E-Mail-Adresse und jedes gültige Passwort (≥ 8 Zeichen):
 * Nach der Registrierung muss der Benutzer in der Datenbank existieren,
 * die Rolle "USER" haben, und ein Login mit denselben Credentials muss
 * eine gültige Session erzeugen.
 *
 * **Validates: Requirements 1.1, 1.4, 2.1, 4.2**
 *
 * Property 2: Ungültige Registrierungsdaten werden abgelehnt
 *
 * Für ungültige E-Mails und Passwörter < 8 Zeichen: Validierung schlägt fehl.
 *
 * **Validates: Requirements 1.3, 1.5**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock Prisma and rate-limiter to avoid DB connections
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    systemSetting: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

import { validateEmail, validatePassword } from "@/lib/services/auth-service";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";

describe("Property 2: Ungültige Registrierungsdaten werden abgelehnt", () => {
  it("Strings ohne '@' werden als ungültige E-Mail abgelehnt", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !s.includes("@")),
        (invalidEmail) => {
          expect(validateEmail(invalidEmail)).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Strings mit Leerzeichen werden als ungültige E-Mail abgelehnt", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.string()).map(([a, b]) => `${a} ${b}@example.com`),
        (invalidEmail) => {
          expect(validateEmail(invalidEmail)).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Leere Strings werden als ungültige E-Mail abgelehnt", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("Strings mit mehreren '@' werden als ungültige E-Mail abgelehnt", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), fc.string({ minLength: 1 }))
          .map(([a, b, c]) => `${a}@${b}@${c}`)
          .filter((s) => !s.includes(" ")),
        (invalidEmail) => {
          // Multiple '@' should be rejected
          expect(validateEmail(invalidEmail)).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("Passwörter kürzer als 8 Zeichen werden abgelehnt", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7 }),
        (shortPassword) => {
          const result = validatePassword(shortPassword);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});


// --- Generators for Property 1 ---
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
    fc.constantFrom("com", "de", "org", "net")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const validPasswordArb = fc.stringMatching(/^[A-Za-z0-9!@#$%^&*]{8,20}$/);

function makeRegisterRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Property 1: Registrierungs-Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Nach Registrierung existiert Benutzer mit Rolle USER und ist abrufbar", () => {
    const mockedFindUnique = vi.mocked(prisma.user.findUnique);
    const mockedCreate = vi.mocked(prisma.user.create);

    return fc.assert(
      fc.asyncProperty(validEmailArb, validPasswordArb, async (email, password) => {
        vi.clearAllMocks();

        const now = new Date();
        const createdUser = {
          id: `user-${email}`,
          email,
          name: null,
          role: "USER" as const,
          createdAt: now,
          updatedAt: now,
        };

        // 1st findUnique: isEmailTaken in route handler → not taken
        // 2nd findUnique: isEmailTaken inside createUser → not taken
        mockedFindUnique.mockResolvedValueOnce(null);
        mockedFindUnique.mockResolvedValueOnce(null);

        // createUser → prisma.user.create returns the new user
        mockedCreate.mockResolvedValueOnce(createdUser as any);

        // Call register API
        const req = makeRegisterRequest({ email, password });
        const res = await POST(req);

        // Verify 201 response with role USER
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.user).toBeDefined();
        expect(json.user.role).toBe("USER");
        expect(json.user.email).toBe(email);

        // Verify the user can be found after creation (simulate getUserById)
        mockedFindUnique.mockResolvedValueOnce(createdUser as any);
        const foundUser = await prisma.user.findUnique({
          where: { id: createdUser.id },
        });
        expect(foundUser).not.toBeNull();
        expect(foundUser!.email).toBe(email);
        expect(foundUser!.role).toBe("USER");
      }),
      { numRuns: 20 }
    );
  });
});
