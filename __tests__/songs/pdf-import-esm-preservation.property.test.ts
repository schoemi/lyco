import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Preservation-Property-Tests — Property 2: Validierungen und Fehlerbehandlung bleiben unverändert
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * Diese Tests prüfen: Für alle Eingaben, bei denen die Bug Condition NICHT zutrifft
 * (fehlende Auth, fehlende Datei, falscher Dateityp, zu große Datei, leerer PDF-Text,
 * LLM-Fehler), soll die Route exakt dieselben Statuscodes und Fehlermeldungen zurückgeben.
 *
 * Observation-First: Verhalten auf UNGEFIXTEM Code beobachtet und als Baseline festgehalten.
 * Diese Tests MÜSSEN auf ungefixtem Code BESTEHEN.
 */

// --- Mocks ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock pdf-parse — named import: import { PDFParse } from "pdf-parse"
// The code does: new PDFParse({ data: buffer }).getText({ pageJoiner: "" })
const mockGetText = vi.fn();
vi.mock("pdf-parse", () => ({
  PDFParse: class {
    constructor() {}
    getText() {
      return mockGetText();
    }
    async destroy() {}
  },
}));

const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

import { POST } from "../../src/app/api/songs/parse-pdf/route";
import { NextRequest } from "next/server";

// --- Helpers ---

const authenticatedSession = {
  user: { id: "user-1", email: "test@example.com", name: "Tester" },
};

function makeRequest(body?: FormData): NextRequest {
  return new NextRequest("http://localhost/api/songs/parse-pdf", {
    method: "POST",
    body: body ?? new FormData(),
  });
}

function makePdfFile(size: number = 100): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], "song.pdf", { type: "application/pdf" });
}

function makeRequestWithFile(file: File): NextRequest {
  const form = new FormData();
  form.append("file", file);
  return new NextRequest("http://localhost/api/songs/parse-pdf", {
    method: "POST",
    body: form,
  });
}

// --- Arbitraries ---

/** Generates non-PDF MIME types */
const arbNonPdfMimeType = fc.constantFrom(
  "text/plain",
  "image/png",
  "image/jpeg",
  "application/json",
  "text/html",
  "application/xml",
  "application/zip",
  "audio/mpeg",
  "video/mp4"
);

/** Generates file extensions matching non-PDF types */
const arbNonPdfExtension = fc.constantFrom(
  "txt", "png", "jpg", "json", "html", "xml", "zip", "mp3", "mp4"
);

/** Generates file sizes strictly above 5MB (5 * 1024 * 1024 = 5242880) */
const arbOversizedBytes = fc.integer({ min: 5 * 1024 * 1024 + 1, max: 8 * 1024 * 1024 });

/** Generates invalid JSON strings (not parseable) */
const arbInvalidJson = fc.constantFrom(
  "not json at all",
  "{broken",
  "{ titel: missing quotes }",
  "[1, 2, 3]",
  "null",
  "undefined",
  "true",
  "",
  "{{{}}}",
  '{ "incomplete": '
);

/** Generates valid JSON but with missing/wrong-typed fields for { titel, kuenstler, text } */
const arbInvalidFormatJson = fc.oneof(
  // Missing titel
  fc.record({
    kuenstler: fc.string({ minLength: 1 }),
    text: fc.string({ minLength: 1 }),
  }).map((o) => JSON.stringify(o)),
  // Missing kuenstler
  fc.record({
    titel: fc.string({ minLength: 1 }),
    text: fc.string({ minLength: 1 }),
  }).map((o) => JSON.stringify(o)),
  // Missing text
  fc.record({
    titel: fc.string({ minLength: 1 }),
    kuenstler: fc.string({ minLength: 1 }),
  }).map((o) => JSON.stringify(o)),
  // Wrong types (numbers instead of strings)
  fc.record({
    titel: fc.integer(),
    kuenstler: fc.integer(),
    text: fc.integer(),
  }).map((o) => JSON.stringify(o))
);

// --- Tests ---

describe("Preservation: Validierungen und Fehlerbehandlung bleiben unverändert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Validates: Requirements 3.1
   * Nicht-authentifizierte Anfragen → Status 401, { error: "Nicht authentifiziert" }
   */
  it("Property 2a: Nicht-authentifizierte Anfragen erhalten Status 401", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(null, undefined, {}, { user: null }, { user: undefined }),
        async (invalidSession) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(invalidSession);

          const req = makeRequestWithFile(makePdfFile());
          const res = await POST(req);

          expect(res.status).toBe(401);
          const json = await res.json();
          expect(json).toEqual({ error: "Nicht authentifiziert" });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Validates: Requirements 3.2
   * Fehlende Datei im FormData → Status 400, { error: "Keine Datei hochgeladen" }
   */
  it("Property 2b: Fehlende Datei im FormData ergibt Status 400", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant("no-file"),
        async () => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);

          // FormData without a "file" field
          const form = new FormData();
          const req = makeRequest(form);
          const res = await POST(req);

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json).toEqual({ error: "Keine Datei hochgeladen" });
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Validates: Requirements 3.3
   * Nicht-PDF-Datei → Status 400, Fehlermeldung enthält "PDF"
   */
  it("Property 2c: Nicht-PDF-Dateien ergeben Status 400 mit PDF-Hinweis", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNonPdfMimeType,
        arbNonPdfExtension,
        fc.uint8Array({ minLength: 1, maxLength: 200 }),
        async (mimeType, ext, content) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);

          const file = new File([content], `test.${ext}`, { type: mimeType });
          const req = makeRequestWithFile(file);
          const res = await POST(req);

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toContain("PDF");
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Validates: Requirements 3.4
   * Datei > 5MB → Status 400, { error: "Datei darf maximal 5MB groß sein" }
   */
  it("Property 2d: Dateien über 5MB ergeben Status 400", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbOversizedBytes,
        async (fileSize) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);

          const file = makePdfFile(fileSize);
          const req = makeRequestWithFile(file);
          const res = await POST(req);

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json).toEqual({ error: "Datei darf maximal 5MB groß sein" });
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Validates: Requirements 3.5
   * PDF ohne extrahierbaren Text → Status 400, { error: "PDF enthält keinen extrahierbaren Text" }
   */
  it("Property 2e: PDFs ohne extrahierbaren Text ergeben Status 400", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", "   ", "\n", "\t", "  \n  \t  "),
        async (emptyText) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);
          mockGetText.mockResolvedValue({ text: emptyText });

          const req = makeRequestWithFile(makePdfFile());
          const res = await POST(req);

          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json).toEqual({ error: "PDF enthält keinen extrahierbaren Text" });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Validates: Requirements 3.6
   * Ungültige LLM-Antwort (kein Content) → Status 500
   */
  it("Property 2f: Fehlende LLM-Antwort ergibt Status 500", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { choices: [] },
          { choices: [{ message: { content: null } }] },
          { choices: [{ message: { content: undefined } }] },
          { choices: [{ message: {} }] }
        ),
        async (llmResponse) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);
          mockGetText.mockResolvedValue({ text: "Some valid PDF text" });
          mockCreate.mockResolvedValue(llmResponse);

          const req = makeRequestWithFile(makePdfFile());
          const res = await POST(req);

          expect(res.status).toBe(500);
          const json = await res.json();
          expect(json.error).toBeTruthy();
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Validates: Requirements 3.6
   * Ungültiges JSON vom LLM → Status 500, { error: "LLM-Antwort ist kein gültiges JSON" }
   */
  it("Property 2g: Ungültiges JSON vom LLM ergibt Status 500", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbInvalidJson,
        async (invalidJson) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);
          mockGetText.mockResolvedValue({ text: "Some valid PDF text" });
          mockCreate.mockResolvedValue({
            choices: [{ message: { content: invalidJson } }],
          });

          const req = makeRequestWithFile(makePdfFile());
          const res = await POST(req);

          expect(res.status).toBe(500);
          const json = await res.json();
          expect(json.error).toBeTruthy();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Validates: Requirements 3.6
   * Gültiges JSON aber ungültiges Format → Status 500, { error: "LLM-Antwort hat ungültiges Format" }
   */
  it("Property 2h: Gültiges JSON mit ungültigem Format ergibt Status 500", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbInvalidFormatJson,
        async (invalidFormatJson) => {
          vi.clearAllMocks();
          mockAuth.mockResolvedValue(authenticatedSession);
          mockGetText.mockResolvedValue({ text: "Some valid PDF text" });
          mockCreate.mockResolvedValue({
            choices: [{ message: { content: invalidFormatJson } }],
          });

          const req = makeRequestWithFile(makePdfFile());
          const res = await POST(req);

          expect(res.status).toBe(500);
          const json = await res.json();
          expect(json).toEqual({ error: "LLM-Antwort hat ungültiges Format" });
        }
      ),
      { numRuns: 20 }
    );
  });
});
