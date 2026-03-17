/**
 * Feature: user-account-control
 * Property 2: Registrierungs-Status abhängig von Bestätigungspflicht
 *
 * Für alle gültigen Registrierungsdaten (gültige E-Mail, Passwort >= 8 Zeichen)
 * und jeden Wert der Bestätigungspflicht-Einstellung gilt:
 * Der accountStatus des neu erstellten Benutzers muss PENDING sein, wenn die
 * Bestätigungspflicht aktiviert ist, und ACTIVE, wenn sie deaktiviert ist.
 *
 * Wenn die Bestätigungspflicht aktiviert ist, muss die Response die Meldung
 * "Ihre Registrierung war erfolgreich. Ihr Konto muss noch von einem Administrator bestätigt werden."
 * enthalten.
 *
 * **Validates: Requirements 1.3, 1.4, 4.5**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

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

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  systemSetting: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom("com", "de", "org", "net")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const validPasswordArb = fc.stringMatching(/^[A-Za-z0-9!@#$%^&*]{8,20}$/);

const optionalNameArb = fc.option(
  fc.string({ minLength: 1, maxLength: 30 }),
  { nil: undefined }
);

function makeRegisterRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Property 2: Registrierungs-Status abhängig von Bestätigungspflicht", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when approval is enabled, new user gets PENDING status and response includes confirmation message", async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        optionalNameArb,
        async (email, password, name) => {
          vi.clearAllMocks();

          const now = new Date();

          // systemSetting: require-approval = true
          mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
            id: "setting-1",
            key: "require-approval",
            value: "true",
            updatedAt: now,
          });

          // isEmailTaken (in route) → not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);
          // isEmailTaken (in createUser) → not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);

          // createUser → returns user with PENDING status
          mockPrisma.user.create.mockResolvedValueOnce({
            id: `user-${email}`,
            email,
            name: name ?? null,
            role: "USER",
            accountStatus: "PENDING",
            createdAt: now,
            updatedAt: now,
          });

          const body: Record<string, unknown> = { email, password };
          if (name !== undefined) body.name = name;

          const res = await POST(makeRegisterRequest(body));
          expect(res.status).toBe(201);

          const json = await res.json();
          expect(json.user).toBeDefined();
          expect(json.user.accountStatus).toBe("PENDING");
          expect(json.message).toBe(
            "Ihre Registrierung war erfolgreich. Ihr Konto muss noch von einem Administrator bestätigt werden."
          );

          // Verify createUser was called with accountStatus PENDING
          expect(mockPrisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                accountStatus: "PENDING",
              }),
            })
          );
        }
      ),
      PBT_CONFIG
    );
  });

  it("when approval is disabled, new user gets ACTIVE status and no confirmation message", async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        optionalNameArb,
        async (email, password, name) => {
          vi.clearAllMocks();

          const now = new Date();

          // systemSetting: require-approval not found (default = false)
          mockPrisma.systemSetting.findUnique.mockResolvedValueOnce(null);

          // isEmailTaken (in route) → not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);
          // isEmailTaken (in createUser) → not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);

          // createUser → returns user with default ACTIVE status
          mockPrisma.user.create.mockResolvedValueOnce({
            id: `user-${email}`,
            email,
            name: name ?? null,
            role: "USER",
            createdAt: now,
            updatedAt: now,
          });

          const body: Record<string, unknown> = { email, password };
          if (name !== undefined) body.name = name;

          const res = await POST(makeRegisterRequest(body));
          expect(res.status).toBe(201);

          const json = await res.json();
          expect(json.user).toBeDefined();
          expect(json.message).toBeUndefined();

          // Verify createUser was NOT called with accountStatus PENDING
          const createCall = mockPrisma.user.create.mock.calls[0]?.[0];
          expect(createCall?.data?.accountStatus).toBeUndefined();
        }
      ),
      PBT_CONFIG
    );
  });

  it("for every approval setting value, status is always correct (combined property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        optionalNameArb,
        fc.boolean(),
        async (email, password, name, requireApproval) => {
          vi.clearAllMocks();

          const now = new Date();

          // systemSetting mock based on requireApproval
          if (requireApproval) {
            mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
              id: "setting-1",
              key: "require-approval",
              value: "true",
              updatedAt: now,
            });
          } else {
            mockPrisma.systemSetting.findUnique.mockResolvedValueOnce(null);
          }

          // isEmailTaken (in route) → not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);
          // isEmailTaken (in createUser) → not taken
          mockPrisma.user.findUnique.mockResolvedValueOnce(null);

          const expectedStatus = requireApproval ? "PENDING" : undefined;

          // createUser → returns user
          mockPrisma.user.create.mockResolvedValueOnce({
            id: `user-${email}`,
            email,
            name: name ?? null,
            role: "USER",
            ...(requireApproval && { accountStatus: "PENDING" }),
            createdAt: now,
            updatedAt: now,
          });

          const body: Record<string, unknown> = { email, password };
          if (name !== undefined) body.name = name;

          const res = await POST(makeRegisterRequest(body));
          expect(res.status).toBe(201);

          const json = await res.json();
          expect(json.user).toBeDefined();

          if (requireApproval) {
            expect(json.user.accountStatus).toBe("PENDING");
            expect(json.message).toBe(
              "Ihre Registrierung war erfolgreich. Ihr Konto muss noch von einem Administrator bestätigt werden."
            );
          } else {
            expect(json.user.accountStatus).toBeUndefined();
            expect(json.message).toBeUndefined();
          }

          // Verify the data passed to createUser
          const createCall = mockPrisma.user.create.mock.calls[0]?.[0];
          if (requireApproval) {
            expect(createCall?.data?.accountStatus).toBe("PENDING");
          } else {
            expect(createCall?.data?.accountStatus).toBeUndefined();
          }
        }
      ),
      PBT_CONFIG
    );
  });
});
