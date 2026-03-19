/**
 * Property 10: Geteilte Inhalte im Dashboard enthalten vollständige Daten
 * Property 11: Geteilter Song-Detail enthält vollständigen Inhalt und Eigentümer-Name
 * Property 15: Freigabe-Übersicht listet alle Empfänger mit Details
 *
 * **Validates: Requirements 4.1, 4.3, 4.4, 5.1, 5.4, 6.5, 7.1, 7.2, 7.3**
 */
// Feature: song-sharing, Properties 10, 11, 15: Geteilte Inhalte, Detail, Übersicht

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Prisma mock ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn() },
    set: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    songFreigabe: { findUnique: vi.fn(), findMany: vi.fn() },
    setFreigabe: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    session: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getEmpfangeneFreigaben, listSongFreigaben, listSetFreigaben } from "@/lib/services/freigabe-service";
import { getSongDetail } from "@/lib/services/song-service";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const idArb = fc.uuid();
const nameArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
const emailArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-z0-9]+$/i.test(s)),
    fc.string({ minLength: 1, maxLength: 8, unit: "grapheme" }).filter((s) => /^[a-z0-9]+$/i.test(s)),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);
const titelArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const kuenstlerArb = fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0));
const coverUrlArb = fc.option(fc.webUrl());
const descriptionArb = fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0));
const prozentArb = fc.integer({ min: 0, max: 100 });
const songCountArb = fc.integer({ min: 1, max: 5 });


/**
 * Property 10: Geteilte Inhalte im Dashboard enthalten vollständige Daten
 *
 * Für jeden Empfänger mit aktiven Freigaben soll die Dashboard-API geteilte Sets
 * mit Name, Beschreibung, Song-Anzahl und geteilte Songs mit Titel, Künstler,
 * Cover und dem eigenen Fortschritt des Empfängers zurückgeben.
 *
 * **Validates: Requirements 4.1, 4.3, 4.4, 6.5**
 */
describe("Feature: song-sharing, Property 10: Geteilte Inhalte im Dashboard enthalten vollständige Daten", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getEmpfangeneFreigaben returns sets with name, description, song count and songs with title, artist, cover, recipient progress", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        nameArb,
        idArb,
        nameArb,
        descriptionArb,
        songCountArb,
        titelArb,
        kuenstlerArb,
        coverUrlArb,
        prozentArb,
        nameArb,
        async (
          recipientId,
          ownerId,
          ownerName,
          setId,
          setName,
          setDescription,
          songCount,
          songTitel,
          songKuenstler,
          songCoverUrl,
          recipientProgress,
          directSongTitel,
        ) => {
          fc.pre(recipientId !== ownerId);
          vi.clearAllMocks();

          const now = new Date();

          // Build songs for the set
          const setSongs = Array.from({ length: songCount }, (_, i) => ({
            orderIndex: i,
            song: {
              id: `song-${i}`,
              titel: `${songTitel}-${i}`,
              kuenstler: songKuenstler,
              sprache: "de",
              emotionsTags: [],
              coverUrl: songCoverUrl,
              strophen: [
                {
                  fortschritte: [{ prozent: recipientProgress }],
                },
              ],
              _count: { sessions: 1 },
            },
          }));

          // Mock setFreigabe.findMany for received set shares
          (mockPrisma.setFreigabe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: `set-freigabe-1`,
              empfaengerId: recipientId,
              eigentuemerId: ownerId,
              createdAt: now,
              eigentuemer: { name: ownerName },
              set: {
                id: setId,
                name: setName,
                description: setDescription,
                songs: setSongs,
              },
            },
          ]);

          // Mock songFreigabe.findMany for received direct song shares
          (mockPrisma.songFreigabe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
            {
              id: `song-freigabe-1`,
              empfaengerId: recipientId,
              eigentuemerId: ownerId,
              createdAt: now,
              eigentuemer: { name: ownerName },
              song: {
                id: `direct-song-1`,
                titel: directSongTitel,
                kuenstler: songKuenstler,
                sprache: "en",
                emotionsTags: ["happy"],
                coverUrl: songCoverUrl,
                strophen: [
                  {
                    fortschritte: [{ prozent: recipientProgress }],
                  },
                ],
                _count: { sessions: 2 },
              },
            },
          ]);

          const result = await getEmpfangeneFreigaben(recipientId);

          // Verify sets structure
          expect(result.sets).toHaveLength(1);
          const receivedSet = result.sets[0];
          expect(receivedSet.set.id).toBe(setId);
          expect(receivedSet.set.name).toBe(setName);
          expect(receivedSet.set.description).toBe(setDescription);
          expect(receivedSet.eigentuemerName).toBe(ownerName);
          expect(receivedSet.songs).toHaveLength(songCount);

          // Verify each song in set has required fields
          for (let i = 0; i < songCount; i++) {
            const song = receivedSet.songs[i];
            expect(song.id).toBe(`song-${i}`);
            expect(song.titel).toBe(`${songTitel}-${i}`);
            expect(song).toHaveProperty("kuenstler");
            expect(song).toHaveProperty("coverUrl");
            expect(song).toHaveProperty("progress");
            expect(typeof song.progress).toBe("number");
            expect(song).toHaveProperty("status");
          }

          // Verify direct songs structure
          expect(result.songs).toHaveLength(1);
          const receivedSong = result.songs[0];
          expect(receivedSong.song.titel).toBe(directSongTitel);
          expect(receivedSong.eigentuemerName).toBe(ownerName);
          expect(receivedSong.song).toHaveProperty("kuenstler");
          expect(receivedSong.song).toHaveProperty("coverUrl");
          expect(receivedSong.song).toHaveProperty("progress");
          expect(typeof receivedSong.song.progress).toBe("number");
        },
      ),
      { numRuns: 100 },
    );
  });
});



/**
 * Property 11: Geteilter Song-Detail enthält vollständigen Inhalt und Eigentümer-Name
 *
 * Für jeden geteilten Song soll die Detail-Antwort den Songtext, die Strophen,
 * die Zeilen, die Audio-Quellen, das Cover und den Namen des Eigentümers enthalten.
 *
 * **Validates: Requirements 5.1, 5.4**
 */
describe("Feature: song-sharing, Property 11: Geteilter Song-Detail enthält vollständigen Inhalt und Eigentümer-Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSongDetail for a recipient returns istFreigabe: true, eigentuemerName, strophen, zeilen, audioQuellen, coverUrl", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        titelArb,
        kuenstlerArb,
        coverUrlArb,
        nameArb,
        async (songId, ownerId, recipientId, titel, kuenstler, coverUrl, ownerName) => {
          fc.pre(ownerId !== recipientId);
          vi.clearAllMocks();

          const now = new Date();
          const stropheId = `strophe-${songId}`;
          const zeileId = `zeile-${songId}`;
          const audioId = `audio-${songId}`;

          // Mock song.findUnique — full song with strophen, zeilen, audioQuellen
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: ownerId,
            titel,
            kuenstler,
            sprache: "de",
            emotionsTags: ["rock"],
            coverUrl,
            analyse: null,
            coachTipp: null,
            audioQuellen: [
              {
                id: audioId,
                url: "https://example.com/audio.mp3",
                typ: "MP3",
                label: "Main",
                orderIndex: 0,
              },
            ],
            sets: [],
            strophen: [
              {
                id: stropheId,
                name: "Strophe 1",
                orderIndex: 0,
                analyse: null,
                zeilen: [
                  {
                    id: zeileId,
                    text: "Hello world",
                    uebersetzung: null,
                    orderIndex: 0,
                    markups: [],
                  },
                ],
                markups: [],
                fortschritte: [{ prozent: 50 }],
                notizen: [],
              },
            ],
          });

          // Mock hatSongZugriff: recipient has access via songFreigabe
          // song.findUnique is called again inside hatSongZugriff
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: ownerId,
          });
          (mockPrisma.songFreigabe.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: `freigabe-${songId}-${recipientId}`,
            songId,
            empfaengerId: recipientId,
          });

          // Mock session.count for the recipient
          (mockPrisma.session.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(3);

          // Mock user.findUnique for owner name lookup
          (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: ownerId,
            name: ownerName,
          });

          const detail = await getSongDetail(recipientId, songId);

          // Verify istFreigabe and eigentuemerName
          expect(detail.istFreigabe).toBe(true);
          expect(detail.eigentuemerName).toBe(ownerName);

          // Verify song content fields
          expect(detail.id).toBe(songId);
          expect(detail.titel).toBe(titel);
          expect(detail.kuenstler).toBe(kuenstler);
          expect(detail.coverUrl).toBe(coverUrl);

          // Verify strophen and zeilen
          expect(detail.strophen).toHaveLength(1);
          expect(detail.strophen[0].id).toBe(stropheId);
          expect(detail.strophen[0].zeilen).toHaveLength(1);
          expect(detail.strophen[0].zeilen[0].id).toBe(zeileId);
          expect(detail.strophen[0].zeilen[0].text).toBe("Hello world");

          // Verify audioQuellen
          expect(detail.audioQuellen).toHaveLength(1);
          expect(detail.audioQuellen[0].id).toBe(audioId);
          expect(detail.audioQuellen[0].url).toBe("https://example.com/audio.mp3");
        },
      ),
      { numRuns: 100 },
    );
  });
});



/**
 * Property 15: Freigabe-Übersicht listet alle Empfänger mit Details
 *
 * Für jeden Song (oder Set) mit beliebig vielen Freigaben soll die
 * Freigabe-Übersicht alle Empfänger mit Name und E-Mail-Adresse auflisten.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */
describe("Feature: song-sharing, Property 15: Freigabe-Übersicht listet alle Empfänger mit Details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listSongFreigaben returns all recipients with name and email", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.array(
          fc.tuple(idArb, nameArb, emailArb),
          { minLength: 1, maxLength: 5 },
        ),
        async (songId, ownerId, recipients) => {
          vi.clearAllMocks();

          const now = new Date();

          // Mock song ownership
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: ownerId,
          });

          // Build freigaben list from recipients
          const freigaben = recipients.map(([empId, empName, empEmail], i) => ({
            id: `freigabe-${i}`,
            songId,
            eigentuemerId: ownerId,
            empfaengerId: empId,
            createdAt: now,
            empfaenger: { id: empId, name: empName, email: empEmail },
          }));

          (mockPrisma.songFreigabe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(freigaben);

          const result = await listSongFreigaben(songId, ownerId);

          // All recipients must be returned
          expect(result).toHaveLength(recipients.length);

          for (let i = 0; i < recipients.length; i++) {
            const [empId, empName, empEmail] = recipients[i];
            const entry = result[i];
            expect(entry.empfaenger.id).toBe(empId);
            expect(entry.empfaenger.name).toBe(empName);
            expect(entry.empfaenger.email).toBe(empEmail);
            expect(entry).toHaveProperty("erstelltAm");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("listSetFreigaben returns all recipients with name and email", async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.array(
          fc.tuple(idArb, nameArb, emailArb),
          { minLength: 1, maxLength: 5 },
        ),
        async (setId, ownerId, recipients) => {
          vi.clearAllMocks();

          const now = new Date();

          // Mock set ownership
          (mockPrisma.set.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: setId,
            userId: ownerId,
          });

          // Build freigaben list from recipients
          const freigaben = recipients.map(([empId, empName, empEmail], i) => ({
            id: `set-freigabe-${i}`,
            setId,
            eigentuemerId: ownerId,
            empfaengerId: empId,
            createdAt: now,
            empfaenger: { id: empId, name: empName, email: empEmail },
          }));

          (mockPrisma.setFreigabe.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(freigaben);

          const result = await listSetFreigaben(setId, ownerId);

          // All recipients must be returned
          expect(result).toHaveLength(recipients.length);

          for (let i = 0; i < recipients.length; i++) {
            const [empId, empName, empEmail] = recipients[i];
            const entry = result[i];
            expect(entry.empfaenger.id).toBe(empId);
            expect(entry.empfaenger.name).toBe(empName);
            expect(entry.empfaenger.email).toBe(empEmail);
            expect(entry).toHaveProperty("erstelltAm");
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
