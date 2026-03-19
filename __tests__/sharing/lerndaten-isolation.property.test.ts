/**
 * Property 13: Empfänger erstellen unabhängige Lerndaten
 * Property 14: Lerndaten-Isolation zwischen Eigentümer und Empfänger
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 */
// Feature: song-sharing, Properties 13, 14: Lerndaten-Isolation

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn() },
    songFreigabe: { findUnique: vi.fn() },
    setFreigabe: { findFirst: vi.fn() },
    strophe: { findUnique: vi.fn(), findMany: vi.fn() },
    session: { create: vi.fn() },
    fortschritt: { upsert: vi.fn() },
    notiz: { upsert: vi.fn(), findMany: vi.fn() },
    interpretation: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/services/session-service";
import { updateProgress, getSongProgress } from "@/lib/services/progress-service";
import { upsertNote, getNotesForSong } from "@/lib/services/note-service";
import {
  upsertInterpretation,
  getInterpretationsForSong,
} from "@/lib/services/interpretation-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const textArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);
const prozentArb = fc.integer({ min: 0, max: 100 });
const lernmethodeArb = fc.constantFrom(
  "EMOTIONAL" as const,
  "LUECKENTEXT" as const,
  "ZEILE_FUER_ZEILE" as const,
  "RUECKWAERTS" as const,
  "SPACED_REPETITION" as const,
  "QUIZ" as const,
);

/**
 * Helper: Sets up mocks so that hatSongZugriff returns true for the given userId.
 * - song.findUnique returns the song with ownerId
 * - For the owner: song.userId === userId → true
 * - For the recipient: songFreigabe.findUnique returns a freigabe record
 */
function setupAccessMocks(
  songId: string,
  ownerId: string,
  userId: string,
) {
  // song.findUnique — always returns the song owned by ownerId
  (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: songId,
    userId: ownerId,
  });

  if (userId === ownerId) {
    // Owner path: hatSongZugriff returns true via ownership
    // songFreigabe.findUnique won't be called
  } else {
    // Recipient path: hatSongZugriff checks songFreigabe
    (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: `freigabe-${songId}-${userId}`,
      songId,
      empfaengerId: userId,
    });
  }

  // setFreigabe.findFirst — not needed, return null
  (mockPrisma.setFreigabe.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}


/**
 * Property 13: Empfänger erstellen unabhängige Lerndaten
 *
 * Für jeden geteilten Song soll der Empfänger eigene Sessions, Fortschritt,
 * Notizen und Interpretationen erstellen können, die seiner eigenen userId
 * zugeordnet sind.
 *
 * **Validates: Requirements 6.1, 6.2**
 */
describe("Feature: song-sharing, Property 13: Empfänger erstellen unabhängige Lerndaten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recipient can create a session assigned to their own userId", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        lernmethodeArb,
        async (songId, ownerId, recipientId, lernmethode) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          setupAccessMocks(songId, ownerId, recipientId);

          const now = new Date();
          const sessionId = `session-${recipientId}-${songId}`;
          (mockPrisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: sessionId,
            userId: recipientId,
            songId,
            lernmethode,
            createdAt: now,
          });

          const session = await createSession(recipientId, songId, lernmethode);

          expect(session.userId).toBe(recipientId);
          expect(session.songId).toBe(songId);
          expect(mockPrisma.session.create).toHaveBeenCalledWith({
            data: { userId: recipientId, songId, lernmethode },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("recipient can update progress assigned to their own userId", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        prozentArb,
        async (songId, ownerId, recipientId, stropheId, prozent) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          // strophe.findUnique returns strophe with song
          (mockPrisma.strophe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: stropheId,
            songId,
            song: { id: songId, userId: ownerId },
          });

          setupAccessMocks(songId, ownerId, recipientId);

          const clamped = Math.max(0, Math.min(100, Math.round(prozent)));
          (mockPrisma.fortschritt.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: `fortschritt-${recipientId}-${stropheId}`,
            userId: recipientId,
            stropheId,
            prozent: clamped,
          });

          const result = await updateProgress(recipientId, stropheId, prozent);

          expect(result.userId).toBe(recipientId);
          expect(result.stropheId).toBe(stropheId);
          expect(mockPrisma.fortschritt.upsert).toHaveBeenCalledWith({
            where: { userId_stropheId: { userId: recipientId, stropheId } },
            update: { prozent: clamped },
            create: { userId: recipientId, stropheId, prozent: clamped },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("recipient can upsert a note assigned to their own userId", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        textArb,
        async (songId, ownerId, recipientId, stropheId, noteText) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          (mockPrisma.strophe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: stropheId,
            songId,
            song: { id: songId, userId: ownerId },
          });

          setupAccessMocks(songId, ownerId, recipientId);

          (mockPrisma.notiz.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: `notiz-${recipientId}-${stropheId}`,
            userId: recipientId,
            stropheId,
            text: noteText.trim(),
          });

          const result = await upsertNote(recipientId, stropheId, noteText);

          expect(result.userId).toBe(recipientId);
          expect(result.stropheId).toBe(stropheId);
          expect(mockPrisma.notiz.upsert).toHaveBeenCalledWith({
            where: { userId_stropheId: { userId: recipientId, stropheId } },
            update: { text: noteText.trim() },
            create: { userId: recipientId, stropheId, text: noteText.trim() },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("recipient can upsert an interpretation assigned to their own userId", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        textArb,
        async (songId, ownerId, recipientId, stropheId, interpText) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          (mockPrisma.strophe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: stropheId,
            songId,
            song: { id: songId, userId: ownerId },
          });

          setupAccessMocks(songId, ownerId, recipientId);

          (mockPrisma.interpretation.upsert as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: `interp-${recipientId}-${stropheId}`,
            userId: recipientId,
            stropheId,
            text: interpText.trim(),
          });

          const result = await upsertInterpretation(recipientId, stropheId, interpText);

          expect(result.userId).toBe(recipientId);
          expect(result.stropheId).toBe(stropheId);
          expect(mockPrisma.interpretation.upsert).toHaveBeenCalledWith({
            where: { userId_stropheId: { userId: recipientId, stropheId } },
            update: { text: interpText.trim() },
            create: { userId: recipientId, stropheId, text: interpText.trim() },
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 14: Lerndaten-Isolation zwischen Eigentümer und Empfänger
 *
 * Für jeden geteilten Song sollen die Lerndaten (Fortschritt, Notizen,
 * Interpretationen) des Eigentümers und des Empfängers vollständig voneinander
 * isoliert sein — das Abfragen der Lerndaten für Nutzer A darf niemals Daten
 * von Nutzer B zurückgeben.
 *
 * **Validates: Requirements 6.3, 6.4**
 */
describe("Feature: song-sharing, Property 14: Lerndaten-Isolation zwischen Eigentümer und Empfänger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSongProgress returns only the requesting user's progress, never the other user's", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        prozentArb,
        prozentArb,
        async (songId, ownerId, recipientId, stropheId, ownerProzent, recipientProzent) => {
          fc.pre(ownerId !== recipientId);
          fc.pre(ownerProzent !== recipientProzent); // ensure different values to detect leaks
          vi.clearAllMocks();

          // --- Query as owner ---
          setupAccessMocks(songId, ownerId, ownerId);

          (mockPrisma.strophe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: stropheId,
              name: "Strophe 1",
              orderIndex: 0,
              fortschritte: [{ prozent: ownerProzent }],
            },
          ]);

          const ownerProgress = await getSongProgress(ownerId, songId);

          // Verify strophe.findMany was called with owner's userId filter
          expect(mockPrisma.strophe.findMany).toHaveBeenCalledWith({
            where: { songId },
            orderBy: { orderIndex: "asc" },
            include: {
              fortschritte: {
                where: { userId: ownerId },
              },
            },
          });
          expect(ownerProgress).toHaveLength(1);
          expect(ownerProgress[0].prozent).toBe(ownerProzent);

          // --- Query as recipient ---
          vi.clearAllMocks();
          setupAccessMocks(songId, ownerId, recipientId);

          (mockPrisma.strophe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: stropheId,
              name: "Strophe 1",
              orderIndex: 0,
              fortschritte: [{ prozent: recipientProzent }],
            },
          ]);

          const recipientProgress = await getSongProgress(recipientId, songId);

          expect(mockPrisma.strophe.findMany).toHaveBeenCalledWith({
            where: { songId },
            orderBy: { orderIndex: "asc" },
            include: {
              fortschritte: {
                where: { userId: recipientId },
              },
            },
          });
          expect(recipientProgress).toHaveLength(1);
          expect(recipientProgress[0].prozent).toBe(recipientProzent);

          // Cross-check: owner's data !== recipient's data
          expect(ownerProgress[0].prozent).not.toBe(recipientProgress[0].prozent);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("getNotesForSong returns only the requesting user's notes, never the other user's", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        textArb,
        textArb,
        async (songId, ownerId, recipientId, stropheId, ownerNote, recipientNote) => {
          fc.pre(ownerId !== recipientId);
          fc.pre(ownerNote.trim() !== recipientNote.trim());
          vi.clearAllMocks();

          const now = new Date();

          // --- Query as owner ---
          setupAccessMocks(songId, ownerId, ownerId);

          (mockPrisma.notiz.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: `notiz-owner-${stropheId}`,
              userId: ownerId,
              stropheId,
              text: ownerNote,
              updatedAt: now,
            },
          ]);

          const ownerNotes = await getNotesForSong(ownerId, songId);

          expect(mockPrisma.notiz.findMany).toHaveBeenCalledWith({
            where: {
              userId: ownerId,
              strophe: { songId },
            },
            orderBy: { updatedAt: "desc" },
          });
          expect(ownerNotes).toHaveLength(1);
          expect(ownerNotes[0].userId).toBe(ownerId);
          expect(ownerNotes[0].text).toBe(ownerNote);

          // --- Query as recipient ---
          vi.clearAllMocks();
          setupAccessMocks(songId, ownerId, recipientId);

          (mockPrisma.notiz.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: `notiz-recipient-${stropheId}`,
              userId: recipientId,
              stropheId,
              text: recipientNote,
              updatedAt: now,
            },
          ]);

          const recipientNotes = await getNotesForSong(recipientId, songId);

          expect(mockPrisma.notiz.findMany).toHaveBeenCalledWith({
            where: {
              userId: recipientId,
              strophe: { songId },
            },
            orderBy: { updatedAt: "desc" },
          });
          expect(recipientNotes).toHaveLength(1);
          expect(recipientNotes[0].userId).toBe(recipientId);
          expect(recipientNotes[0].text).toBe(recipientNote);

          // Cross-check: no data leakage
          expect(ownerNotes[0].userId).not.toBe(recipientNotes[0].userId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("getInterpretationsForSong returns only the requesting user's interpretations, never the other user's", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        textArb,
        textArb,
        async (songId, ownerId, recipientId, stropheId, ownerInterp, recipientInterp) => {
          fc.pre(ownerId !== recipientId);
          fc.pre(ownerInterp.trim() !== recipientInterp.trim());
          vi.clearAllMocks();

          const now = new Date();

          // --- Query as owner ---
          setupAccessMocks(songId, ownerId, ownerId);

          (mockPrisma.interpretation.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: `interp-owner-${stropheId}`,
              userId: ownerId,
              stropheId,
              text: ownerInterp,
              updatedAt: now,
            },
          ]);

          const ownerInterps = await getInterpretationsForSong(ownerId, songId);

          expect(mockPrisma.interpretation.findMany).toHaveBeenCalledWith({
            where: {
              userId: ownerId,
              strophe: { songId },
            },
            orderBy: { updatedAt: "desc" },
          });
          expect(ownerInterps).toHaveLength(1);
          expect(ownerInterps[0].userId).toBe(ownerId);
          expect(ownerInterps[0].text).toBe(ownerInterp);

          // --- Query as recipient ---
          vi.clearAllMocks();
          setupAccessMocks(songId, ownerId, recipientId);

          (mockPrisma.interpretation.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: `interp-recipient-${stropheId}`,
              userId: recipientId,
              stropheId,
              text: recipientInterp,
              updatedAt: now,
            },
          ]);

          const recipientInterps = await getInterpretationsForSong(recipientId, songId);

          expect(mockPrisma.interpretation.findMany).toHaveBeenCalledWith({
            where: {
              userId: recipientId,
              strophe: { songId },
            },
            orderBy: { updatedAt: "desc" },
          });
          expect(recipientInterps).toHaveLength(1);
          expect(recipientInterps[0].userId).toBe(recipientId);
          expect(recipientInterps[0].text).toBe(recipientInterp);

          // Cross-check: no data leakage
          expect(ownerInterps[0].userId).not.toBe(recipientInterps[0].userId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
