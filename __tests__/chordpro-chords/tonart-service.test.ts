/**
 * Unit-Tests für Tonart-Service-Erweiterung
 *
 * Tests für importSong() mit tonart, bpm, taktZaehler, taktNenner
 * Tests für updateSong() mit tonart
 * Tests für getSongDetail() mit tonart-Rückgabe
 * Tests für null-Wert wenn kein tonart gesetzt
 *
 * _Requirements: 1.2, 1.3, 1.4_
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ImportSongInput } from "../../src/types/song";

// --- In-memory store types ---
interface StoredSong {
  id: string;
  titel: string;
  kuenstler: string | null;
  sprache: string | null;
  emotionsTags: string[];
  coverUrl: string | null;
  tonart: string | null;
  analyse: string | null;
  coachTipp: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredStrophe {
  id: string;
  name: string;
  orderIndex: number;
  istInstrumental: boolean;
  startTakt: number | null;
  endTakt: number | null;
  songId: string;
}

interface StoredZeile {
  id: string;
  text: string;
  uebersetzung: string | null;
  istKommentar: boolean;
  startTakt: number | null;
  endTakt: number | null;
  orderIndex: number;
  stropheId: string;
}

interface StoredBeatErgebnis {
  id: string;
  songId: string;
  bpm: number;
  methode: string;
  konfidenz: number | null;
  beatPositionenMs: number[];
  frequenzUntergrenze: number | null;
  frequenzObergrenze: number | null;
  offsetMs: number | null;
  taktZaehler: number;
  taktNenner: number;
}

interface StoredMarkup {
  id: string;
  typ: string;
  ziel: string;
  wert: string | null;
  timecodeMs: number | null;
  wortIndex: number | null;
  stropheId: string | null;
  zeileId: string | null;
}

// --- In-memory database ---
let songs: StoredSong[] = [];
let strophen: StoredStrophe[] = [];
let zeilen: StoredZeile[] = [];
let beatErgebnisse: StoredBeatErgebnis[] = [];
let markups: StoredMarkup[] = [];
let idCounter = 0;

function nextId(): string {
  return `id-${++idCounter}`;
}

function resetDb() {
  songs = [];
  strophen = [];
  zeilen = [];
  beatErgebnisse = [];
  markups = [];
  idCounter = 0;
}

// --- Mock Prisma ---
const { mockPrisma } = vi.hoisted(() => {
  const _mockSong = {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const _mockStrophe = { create: vi.fn() };
  const _mockZeile = { create: vi.fn() };
  const _mockMarkup = { create: vi.fn() };
  const _mockBeatErgebnis = { create: vi.fn() };
  const _mockSession = { count: vi.fn() };

  const _mockPrisma: Record<string, unknown> = {
    song: _mockSong,
    strophe: _mockStrophe,
    zeile: _mockZeile,
    markup: _mockMarkup,
    beatErgebnis: _mockBeatErgebnis,
    session: _mockSession,
  };

  _mockPrisma.$transaction = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(_mockPrisma)
  );

  return { mockPrisma: _mockPrisma };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/services/freigabe-service", () => ({
  hatSongZugriff: vi.fn().mockResolvedValue(false),
}));

import { prisma } from "@/lib/prisma";
import {
  importSong,
  updateSong,
  getSongDetail,
} from "@/lib/services/song-service";

const TEST_USER_ID = "test-user-1";

// --- Mock setup helpers ---
function setupMocks() {
  // Song create
  vi.mocked(prisma.song.create).mockImplementation(async (args: any) => {
    const song: StoredSong = {
      id: nextId(),
      titel: args.data.titel,
      kuenstler: args.data.kuenstler ?? null,
      sprache: args.data.sprache ?? null,
      emotionsTags: args.data.emotionsTags ?? [],
      coverUrl: args.data.coverUrl ?? null,
      tonart: args.data.tonart ?? null,
      analyse: null,
      coachTipp: null,
      userId: args.data.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    songs.push(song);
    return song as any;
  });

  // Strophe create
  vi.mocked(prisma.strophe.create).mockImplementation(async (args: any) => {
    const strophe: StoredStrophe = {
      id: nextId(),
      name: args.data.name,
      orderIndex: args.data.orderIndex,
      istInstrumental: args.data.istInstrumental ?? false,
      startTakt: args.data.startTakt ?? null,
      endTakt: args.data.endTakt ?? null,
      songId: args.data.songId,
    };
    strophen.push(strophe);
    return strophe as any;
  });

  // Zeile create
  vi.mocked(prisma.zeile.create).mockImplementation(async (args: any) => {
    const zeile: StoredZeile = {
      id: nextId(),
      text: args.data.text,
      uebersetzung: args.data.uebersetzung ?? null,
      istKommentar: args.data.istKommentar ?? false,
      startTakt: args.data.startTakt ?? null,
      endTakt: args.data.endTakt ?? null,
      orderIndex: args.data.orderIndex,
      stropheId: args.data.stropheId,
    };
    zeilen.push(zeile);
    return zeile as any;
  });

  // Markup create
  vi.mocked(prisma.markup.create).mockImplementation(async (args: any) => {
    const markup: StoredMarkup = {
      id: nextId(),
      typ: args.data.typ,
      ziel: args.data.ziel,
      wert: args.data.wert ?? null,
      timecodeMs: args.data.timecodeMs ?? null,
      wortIndex: args.data.wortIndex ?? null,
      stropheId: args.data.stropheId ?? null,
      zeileId: args.data.zeileId ?? null,
    };
    markups.push(markup);
    return markup as any;
  });

  // BeatErgebnis create
  vi.mocked((prisma as any).beatErgebnis.create).mockImplementation(
    async (args: any) => {
      const beat: StoredBeatErgebnis = {
        id: nextId(),
        songId: args.data.songId,
        bpm: args.data.bpm,
        methode: args.data.methode,
        konfidenz: args.data.konfidenz ?? null,
        beatPositionenMs: args.data.beatPositionenMs ?? [],
        frequenzUntergrenze: args.data.frequenzUntergrenze ?? null,
        frequenzObergrenze: args.data.frequenzObergrenze ?? null,
        offsetMs: args.data.offsetMs ?? null,
        taktZaehler: args.data.taktZaehler ?? 4,
        taktNenner: args.data.taktNenner ?? 4,
      };
      beatErgebnisse.push(beat);
      return beat as any;
    }
  );

  // Session count
  vi.mocked(prisma.session.count).mockResolvedValue(0);

  // Song findUnique: reconstruct full song with nested includes
  vi.mocked(prisma.song.findUnique).mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    if (!song) return null as any;

    const songStrophen = strophen
      .filter((s) => s.songId === songId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => {
        const stropheZeilen = zeilen
          .filter((z) => z.stropheId === s.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((z) => ({
            ...z,
            markups: markups.filter((m) => m.zeileId === z.id),
          }));

        const stropheMarkups = markups.filter((m) => m.stropheId === s.id);

        return {
          ...s,
          zeilen: stropheZeilen,
          markups: stropheMarkups,
          fortschritte: [],
          notizen: [],
        };
      });

    const beat = beatErgebnisse.find((b) => b.songId === songId) ?? null;

    return {
      ...song,
      strophen: songStrophen,
      audioQuellen: [],
      sets: [],
      beatErgebnis: beat,
    } as any;
  });

  // Song update
  vi.mocked(prisma.song.update).mockImplementation(async (args: any) => {
    const songId = args.where.id;
    const song = songs.find((s) => s.id === songId);
    if (!song) throw new Error("Song nicht gefunden");

    if (args.data.titel !== undefined) song.titel = args.data.titel;
    if (args.data.kuenstler !== undefined)
      song.kuenstler = args.data.kuenstler;
    if (args.data.sprache !== undefined) song.sprache = args.data.sprache;
    if (args.data.emotionsTags !== undefined)
      song.emotionsTags = args.data.emotionsTags;
    if (args.data.coverUrl !== undefined) song.coverUrl = args.data.coverUrl;
    if (args.data.tonart !== undefined) song.tonart = args.data.tonart;

    return song as any;
  });
}

// --- Helper to create a minimal import input ---
function makeImportInput(
  overrides: Partial<ImportSongInput> = {}
): ImportSongInput {
  return {
    titel: "Test Song",
    strophen: [
      {
        name: "Verse 1",
        zeilen: [{ text: "Hello World" }],
      },
    ],
    ...overrides,
  };
}

describe("Tonart-Service-Erweiterung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    setupMocks();
  });

  describe("importSong() mit tonart", () => {
    it("persistiert tonart beim Import", async () => {
      const input = makeImportInput({ tonart: "Am" });
      const result = await importSong(TEST_USER_ID, input);

      expect(result.tonart).toBe("Am");
    });

    it("persistiert komplexe Tonart-Werte (z.B. F#m)", async () => {
      const input = makeImportInput({ tonart: "F#m" });
      const result = await importSong(TEST_USER_ID, input);

      expect(result.tonart).toBe("F#m");
    });

    it("setzt tonart auf null wenn nicht angegeben", async () => {
      const input = makeImportInput();
      const result = await importSong(TEST_USER_ID, input);

      expect(result.tonart).toBeNull();
    });
  });

  describe("importSong() mit bpm und BeatErgebnis", () => {
    it("erstellt BeatErgebnis mit methode MANUELL wenn bpm angegeben", async () => {
      const input = makeImportInput({ bpm: 120 });
      const result = await importSong(TEST_USER_ID, input);

      expect(result.beatErgebnis).not.toBeNull();
      expect(result.beatErgebnis!.bpm).toBe(120);
      expect(result.beatErgebnis!.methode).toBe("MANUELL");
    });

    it("verwendet Standard-Taktart 4/4 wenn nicht angegeben", async () => {
      const input = makeImportInput({ bpm: 100 });
      const result = await importSong(TEST_USER_ID, input);

      expect(result.beatErgebnis).not.toBeNull();
      expect(result.beatErgebnis!.taktZaehler).toBe(4);
      expect(result.beatErgebnis!.taktNenner).toBe(4);
    });

    it("übernimmt taktZaehler und taktNenner aus Import", async () => {
      const input = makeImportInput({
        bpm: 90,
        taktZaehler: 3,
        taktNenner: 4,
      });
      const result = await importSong(TEST_USER_ID, input);

      expect(result.beatErgebnis).not.toBeNull();
      expect(result.beatErgebnis!.bpm).toBe(90);
      expect(result.beatErgebnis!.taktZaehler).toBe(3);
      expect(result.beatErgebnis!.taktNenner).toBe(4);
    });

    it("erstellt kein BeatErgebnis wenn bpm nicht angegeben", async () => {
      const input = makeImportInput();
      const result = await importSong(TEST_USER_ID, input);

      expect(result.beatErgebnis).toBeNull();
    });

    it("kombiniert tonart und bpm korrekt", async () => {
      const input = makeImportInput({
        tonart: "C",
        bpm: 140,
        taktZaehler: 6,
        taktNenner: 8,
      });
      const result = await importSong(TEST_USER_ID, input);

      expect(result.tonart).toBe("C");
      expect(result.beatErgebnis).not.toBeNull();
      expect(result.beatErgebnis!.bpm).toBe(140);
      expect(result.beatErgebnis!.taktZaehler).toBe(6);
      expect(result.beatErgebnis!.taktNenner).toBe(8);
    });
  });

  describe("updateSong() mit tonart", () => {
    it("aktualisiert tonart auf einen Wert", async () => {
      // First create a song via import
      const input = makeImportInput();
      const imported = await importSong(TEST_USER_ID, input);

      const updated = await updateSong(TEST_USER_ID, imported.id, {
        tonart: "Dm",
      });

      expect(updated.tonart).toBe("Dm");
    });

    it("setzt tonart auf null", async () => {
      const input = makeImportInput({ tonart: "G" });
      const imported = await importSong(TEST_USER_ID, input);

      const updated = await updateSong(TEST_USER_ID, imported.id, {
        tonart: null,
      });

      expect(updated.tonart).toBeNull();
    });

    it("lässt tonart unverändert wenn nicht im Update enthalten", async () => {
      const input = makeImportInput({ tonart: "Bb" });
      const imported = await importSong(TEST_USER_ID, input);

      const updated = await updateSong(TEST_USER_ID, imported.id, {
        titel: "Neuer Titel",
      });

      // tonart should remain unchanged (Bb)
      expect(updated.tonart).toBe("Bb");
    });
  });

  describe("getSongDetail() mit tonart", () => {
    it("gibt tonart in der Antwort zurück", async () => {
      const input = makeImportInput({ tonart: "Em" });
      const imported = await importSong(TEST_USER_ID, input);

      // getSongDetail is called internally by importSong, but let's call it directly too
      const detail = await getSongDetail(TEST_USER_ID, imported.id);

      expect(detail.tonart).toBe("Em");
    });

    it("gibt null zurück wenn kein tonart gesetzt", async () => {
      const input = makeImportInput();
      const imported = await importSong(TEST_USER_ID, input);

      const detail = await getSongDetail(TEST_USER_ID, imported.id);

      expect(detail.tonart).toBeNull();
    });
  });
});
