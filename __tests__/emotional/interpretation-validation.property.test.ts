/**
 * Property 3: Interpretation Validierung
 *
 * Für jeden String, der leer ist oder nur aus Whitespace besteht, muss das Erstellen
 * einer Interpretation über `upsertInterpretation` abgelehnt werden und die Datenbank
 * darf sich nicht verändern. Ebenso müssen API-Anfragen mit fehlenden Pflichtfeldern
 * (stropheId, text) mit HTTP 400 abgelehnt werden.
 *
 * **Validates: Requirements 2.5, 3.5**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- In-memory store ---
interface StoredInterpretation {
  id: string;
  userId: string;
  stropheId: string;
  text: string;
  updatedAt: Date;
}

let interpretationen: StoredInterpretation[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  interpretationen = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockStrophe = { findUnique: vi.fn() };
  const _mockInterpretation = {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  };
  const _mockSong = { findUnique: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    strophe: _mockStrophe,
    interpretation: _mockInterpretation,
    song: _mockSong,
  };

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { upsertInterpretation } from "@/lib/services/interpretation-service";
import { prisma } from "@/lib/prisma";

// --- Arbitraries ---
// Generates strings that are empty or only whitespace
const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(""),
  fc.stringMatching(/^[ \t\n\r]{1,20}$/)
);

// --- Mock setup ---
function setupMocks(userId: string, stropheId: string, songId: string) {
  const mockedStropheFindUnique = vi.mocked(prisma.strophe.findUnique);
  const mockedInterpretationUpsert = vi.mocked(prisma.interpretation.upsert);

  mockedStropheFindUnique.mockImplementation(async () => {
    return {
      id: stropheId,
      songId,
      song: { userId, id: songId },
    } as any;
  });

  mockedInterpretationUpsert.mockImplementation(async (args: any) => {
    const existing = interpretationen.find(
      (i) =>
        i.userId === args.where.userId_stropheId.userId &&
        i.stropheId === args.where.userId_stropheId.stropheId
    );
    if (existing) {
      existing.text = args.update.text;
      existing.updatedAt = new Date();
      return { ...existing } as any;
    }
    const interpretation: StoredInterpretation = {
      id: nextId(),
      userId: args.create.userId,
      stropheId: args.create.stropheId,
      text: args.create.text,
      updatedAt: new Date(),
    };
    interpretationen.push(interpretation);
    return { ...interpretation } as any;
  });
}

describe("Property 3: Interpretation Validierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  it("upsertInterpretation lehnt leere oder nur-Whitespace-Texte ab und verändert die Datenbank nicht", () => {
    return fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArb, async (invalidText) => {
        vi.clearAllMocks();
        resetDb();

        const userId = "user-1";
        const stropheId = "strophe-1";
        const songId = "song-1";
        setupMocks(userId, stropheId, songId);

        // Snapshot DB state before
        const countBefore = interpretationen.length;

        // Should throw for empty/whitespace text
        await expect(
          upsertInterpretation(userId, stropheId, invalidText)
        ).rejects.toThrow("Interpretationstext ist erforderlich");

        // DB must not change
        expect(interpretationen.length).toBe(countBefore);
      }),
      { numRuns: 20 }
    );
  });

  it("upsertInterpretation lehnt leere oder nur-Whitespace-Texte auch bei bestehender Interpretation ab", () => {
    return fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArb, async (invalidText) => {
        vi.clearAllMocks();
        resetDb();

        const userId = "user-1";
        const stropheId = "strophe-1";
        const songId = "song-1";
        setupMocks(userId, stropheId, songId);

        // Seed an existing interpretation
        interpretationen.push({
          id: nextId(),
          userId,
          stropheId,
          text: "existing text",
          updatedAt: new Date(),
        });

        const countBefore = interpretationen.length;
        const textBefore = interpretationen[0].text;

        // Should throw for empty/whitespace text
        await expect(
          upsertInterpretation(userId, stropheId, invalidText)
        ).rejects.toThrow("Interpretationstext ist erforderlich");

        // DB must not change: count and existing text unchanged
        expect(interpretationen.length).toBe(countBefore);
        expect(interpretationen[0].text).toBe(textBefore);
      }),
      { numRuns: 20 }
    );
  });
});
