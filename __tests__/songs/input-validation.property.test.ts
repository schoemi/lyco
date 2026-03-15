/**
 * Property 15: Eingabevalidierung
 *
 * Für jeden ungültigen Eingabe-Payload (fehlende Pflichtfelder, falsche Typen,
 * ungültige Enum-Werte): Antwort ist HTTP 400 mit beschreibender Fehlermeldung.
 *
 * **Validates: Requirements 9.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Mock auth to return a valid session ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com" },
  });
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// Mock all service modules to prevent real DB calls
vi.mock("@/lib/services/set-service", () => ({
  listSets: vi.fn(),
  createSet: vi.fn(),
  updateSet: vi.fn(),
  deleteSet: vi.fn(),
  addSongToSet: vi.fn(),
  removeSongFromSet: vi.fn(),
}));

vi.mock("@/lib/services/song-service", () => ({
  listSongs: vi.fn(),
  createSong: vi.fn(),
  importSong: vi.fn(),
  getSongDetail: vi.fn(),
  updateSong: vi.fn(),
  deleteSong: vi.fn(),
}));

vi.mock("@/lib/services/session-service", () => ({
  createSession: vi.fn(),
  getSessionCount: vi.fn(),
  getTotalSessionCount: vi.fn(),
}));

vi.mock("@/lib/services/progress-service", () => ({
  updateProgress: vi.fn(),
  getSongProgress: vi.fn(),
  getAverageProgress: vi.fn(),
}));

vi.mock("@/lib/services/note-service", () => ({
  upsertNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock("@/lib/services/markup-service", () => ({
  createMarkup: vi.fn(),
  updateMarkup: vi.fn(),
  deleteMarkup: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handlers ---
import { POST as setsPOST } from "@/app/api/sets/route";
import { POST as songsPOST } from "@/app/api/songs/route";
import { POST as songsImportPOST } from "@/app/api/songs/import/route";
import { POST as sessionsPOST } from "@/app/api/sessions/route";
import { PUT as progressPUT } from "@/app/api/progress/route";
import { POST as notesPOST } from "@/app/api/notes/route";
import { POST as markupsPOST } from "@/app/api/markups/route";
import { POST as setIdSongsPOST } from "@/app/api/sets/[id]/songs/route";

// --- Helpers ---
function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}


// --- Arbitraries for invalid payloads ---

/** Generates empty or whitespace-only strings */
const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(""),
  fc.constant("   "),
  fc.constant("\t"),
  fc.constant("\n"),
  fc.constant("  \n\t  ")
);

/** Generates non-string values (numbers, booleans, null, undefined, arrays, objects) */
const nonStringArb = fc.oneof(
  fc.integer().map((n) => n as unknown),
  fc.boolean().map((b) => b as unknown),
  fc.constant(null as unknown),
  fc.constant(undefined as unknown),
  fc.constant([] as unknown),
  fc.constant({} as unknown)
);

/** Generates invalid markup typ values (not in the MarkupTyp enum) */
const invalidMarkupTypArb = fc.string({ minLength: 1 }).filter(
  (s) =>
    ![
      "PAUSE", "WIEDERHOLUNG", "ATMUNG", "KOPFSTIMME",
      "BRUSTSTIMME", "BELT", "FALSETT", "TIMECODE",
    ].includes(s)
);

/** Generates invalid markup ziel values (not in the MarkupZiel enum) */
const invalidMarkupZielArb = fc.string({ minLength: 1 }).filter(
  (s) => !["STROPHE", "ZEILE", "WORT"].includes(s)
);

describe("Property 15: Eingabevalidierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    });
  });

  // 1. POST /api/sets with empty/missing name → 400
  it("POST /api/sets mit leerem/fehlendem Name gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(emptyOrWhitespaceArb, nonStringArb),
        async (invalidName) => {
          const body = invalidName === undefined ? {} : { name: invalidName };
          const req = makeRequest("POST", "/api/sets", body);
          const res = await setsPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
          expect(json.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  // 2. POST /api/songs with empty/missing titel → 400
  it("POST /api/songs mit leerem/fehlendem Titel gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(emptyOrWhitespaceArb, nonStringArb),
        async (invalidTitel) => {
          const body = invalidTitel === undefined ? {} : { titel: invalidTitel };
          const req = makeRequest("POST", "/api/songs", body);
          const res = await songsPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
          expect(json.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  // 3. POST /api/songs/import with empty/missing titel → 400
  it("POST /api/songs/import mit leerem/fehlendem Titel gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(emptyOrWhitespaceArb, nonStringArb),
        async (invalidTitel) => {
          const body = invalidTitel === undefined
            ? { strophen: [{ name: "V1", zeilen: [{ text: "Hallo" }] }] }
            : { titel: invalidTitel, strophen: [{ name: "V1", zeilen: [{ text: "Hallo" }] }] };
          const req = makeRequest("POST", "/api/songs/import", body);
          const res = await songsImportPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 4. POST /api/songs/import with empty strophen array → 400
  it("POST /api/songs/import mit leerem Strophen-Array gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant([]),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant("not-an-array"),
          fc.integer()
        ),
        async (invalidStrophen) => {
          const body: Record<string, unknown> = { titel: "Test Song" };
          if (invalidStrophen !== undefined) {
            body.strophen = invalidStrophen;
          }
          const req = makeRequest("POST", "/api/songs/import", body);
          const res = await songsImportPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 5. POST /api/songs/import with strophe that has empty zeilen → 400
  it("POST /api/songs/import mit Strophe ohne Zeilen gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant([]),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant("not-an-array")
        ),
        async (invalidZeilen) => {
          const strophe: Record<string, unknown> = { name: "Verse 1" };
          if (invalidZeilen !== undefined) {
            strophe.zeilen = invalidZeilen;
          }
          const body = { titel: "Test Song", strophen: [strophe] };
          const req = makeRequest("POST", "/api/songs/import", body);
          const res = await songsImportPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 6. POST /api/sessions with missing songId → 400
  it("POST /api/sessions mit fehlendem songId gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ songId: "" }),
          nonStringArb.map((v) => ({ songId: v })),
          fc.constant({})
        ),
        async (bodyPart) => {
          const body = { ...bodyPart, lernmethode: "EMOTIONAL" };
          const req = makeRequest("POST", "/api/sessions", body);
          const res = await sessionsPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 7. POST /api/sessions with missing lernmethode → 400
  it("POST /api/sessions mit fehlender Lernmethode gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ lernmethode: "" }),
          nonStringArb.map((v) => ({ lernmethode: v })),
          fc.constant({})
        ),
        async (bodyPart) => {
          const body = { songId: "song-123", ...bodyPart };
          const req = makeRequest("POST", "/api/sessions", body);
          const res = await sessionsPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 8. PUT /api/progress with missing stropheId → 400
  it("PUT /api/progress mit fehlendem stropheId gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ stropheId: "" }),
          nonStringArb.map((v) => ({ stropheId: v })),
          fc.constant({})
        ),
        async (bodyPart) => {
          const body = { ...bodyPart, prozent: 50 };
          const req = makeRequest("PUT", "/api/progress", body);
          const res = await progressPUT(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 9. PUT /api/progress with missing/non-number prozent → 400
  it("PUT /api/progress mit fehlendem/nicht-numerischem Prozent gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(undefined),
          fc.constant(null),
          fc.string().map((s) => s as unknown),
          fc.boolean().map((b) => b as unknown),
          fc.constant([] as unknown),
          fc.constant({} as unknown)
        ),
        async (invalidProzent) => {
          const body: Record<string, unknown> = { stropheId: "strophe-123" };
          if (invalidProzent !== undefined) {
            body.prozent = invalidProzent;
          }
          const req = makeRequest("PUT", "/api/progress", body);
          const res = await progressPUT(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 10. POST /api/notes with missing stropheId → 400
  it("POST /api/notes mit fehlendem stropheId gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          emptyOrWhitespaceArb.map((s) => ({ stropheId: s })),
          nonStringArb.map((v) => ({ stropheId: v })),
          fc.constant({})
        ),
        async (bodyPart) => {
          const body = { ...bodyPart, text: "Eine Notiz" };
          const req = makeRequest("POST", "/api/notes", body);
          const res = await notesPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 11. POST /api/notes with empty text → 400
  it("POST /api/notes mit leerem Text gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(emptyOrWhitespaceArb, nonStringArb),
        async (invalidText) => {
          const body: Record<string, unknown> = { stropheId: "strophe-123" };
          if (invalidText !== undefined) {
            body.text = invalidText;
          }
          const req = makeRequest("POST", "/api/notes", body);
          const res = await notesPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 12. POST /api/markups with invalid typ → 400
  it("POST /api/markups mit ungültigem Typ gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          invalidMarkupTypArb,
          fc.constant(""),
          fc.constant(null),
          fc.constant(undefined),
          fc.integer().map((n) => n as unknown)
        ),
        async (invalidTyp) => {
          const body: Record<string, unknown> = {
            ziel: "STROPHE",
            stropheId: "strophe-123",
          };
          if (invalidTyp !== undefined) {
            body.typ = invalidTyp;
          }
          const req = makeRequest("POST", "/api/markups", body);
          const res = await markupsPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 13. POST /api/markups with invalid ziel → 400
  it("POST /api/markups mit ungültigem Ziel gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          invalidMarkupZielArb,
          fc.constant(""),
          fc.constant(null),
          fc.constant(undefined),
          fc.integer().map((n) => n as unknown)
        ),
        async (invalidZiel) => {
          const body: Record<string, unknown> = {
            typ: "PAUSE",
            stropheId: "strophe-123",
          };
          if (invalidZiel !== undefined) {
            body.ziel = invalidZiel;
          }
          const req = makeRequest("POST", "/api/markups", body);
          const res = await markupsPOST(req);
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });

  // 14. POST /api/sets/[id]/songs with missing songId → 400
  it("POST /api/sets/[id]/songs mit fehlendem songId gibt 400 zurück", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant({ songId: "" }),
          nonStringArb.map((v) => ({ songId: v })),
          fc.constant({})
        ),
        async (bodyPart) => {
          const req = makeRequest("POST", "/api/sets/set-123/songs", bodyPart);
          const res = await setIdSongsPOST(req, makeParams({ id: "set-123" }));
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toBeDefined();
          expect(typeof json.error).toBe("string");
        }
      ),
      { numRuns: 20 }
    );
  });
});
