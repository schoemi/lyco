import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

/**
 * Feature: user-account-control
 * Property 8: Bestätigungspflicht-Einstellung Round-Trip
 *
 * Validates: Requirements 4.3, 4.4
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getRequireApproval,
  setRequireApproval,
} from "@/lib/services/system-setting-service";

const mockPrisma = vi.mocked(prisma);

describe("Property 8: Bestätigungspflicht-Einstellung Round-Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("after setRequireApproval(v), getRequireApproval() returns v for every boolean", async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (v) => {
        vi.clearAllMocks();

        // setRequireApproval upserts the value
        mockPrisma.systemSetting.upsert.mockResolvedValueOnce({
          id: "setting-id",
          key: "require-approval",
          value: String(v),
          updatedAt: new Date(),
        });

        await setRequireApproval(v);

        expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
          where: { key: "require-approval" },
          update: { value: String(v) },
          create: { key: "require-approval", value: String(v) },
        });

        // getRequireApproval reads the value back
        mockPrisma.systemSetting.findUnique.mockResolvedValueOnce({
          id: "setting-id",
          key: "require-approval",
          value: String(v),
          updatedAt: new Date(),
        });

        const result = await getRequireApproval();

        expect(result).toBe(v);
      }),
      { numRuns: 100 }
    );
  });
});
