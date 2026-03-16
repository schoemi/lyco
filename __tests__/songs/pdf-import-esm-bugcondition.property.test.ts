import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Bug-Condition-Explorationstest — Property 1: ESM-Default-Import schlägt fehl
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2
 *
 * Dieser Test prüft: Für eine gültige PDF-Datei eines authentifizierten Nutzers
 * soll die Route den PDF-Text erfolgreich extrahieren und als JSON
 * { titel, kuenstler, text } zurückgeben.
 *
 * Der Mock von pdf-parse spiegelt den aktuellen Default-Import-Stil wider:
 * { default: (buffer) => ... }
 *
 * Auf UNGEFIXTEM Code wird dieser Test FEHLSCHLAGEN, da der Default-Import
 * unter strikter ESM-Auflösung nicht korrekt aufgelöst wird.
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

function makePdfFile(content: Uint8Array = new Uint8Array(100)): File {
  return new File([content], "song.pdf", { type: "application/pdf" });
}

function makeRequest(file: File): NextRequest {
  const form = new FormData();
  form.append("file", file);
  return new NextRequest("http://localhost/api/songs/parse-pdf", {
    method: "POST",
    body: form,
  });
}

// --- Arbitraries ---

/** Generates non-empty song titles */
const arbTitel = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Generates non-empty artist names */
const arbKuenstler = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Generates non-empty song text with at least one line */
const arbText = fc
  .array(fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0), {
    minLength: 1,
    maxLength: 10,
  })
  .map((lines) => lines.join("\n"));

/** Generates non-empty PDF raw text */
const arbPdfRawText = fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0);

/** Generates a small valid PDF file buffer (under 5MB) */
const arbPdfBuffer = fc
  .uint8Array({ minLength: 10, maxLength: 1000 })
  .map((arr) => new Uint8Array(arr));

// --- Test ---

describe("Bug Condition Exploration: ESM-Default-Import von pdf-parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "Property 1: Für eine gültige PDF eines authentifizierten Nutzers gibt die Route JSON { titel, kuenstler, text } zurück",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTitel,
          arbKuenstler,
          arbText,
          arbPdfRawText,
          arbPdfBuffer,
          async (titel, kuenstler, text, pdfRawText, pdfBuffer) => {
            vi.clearAllMocks();

            // Authenticated user
            mockAuth.mockResolvedValue(authenticatedSession);

            // pdf-parse returns extracted text
            mockGetText.mockResolvedValue({ text: pdfRawText });

            // OpenAI returns structured JSON
            const llmResult = { titel, kuenstler, text };
            mockCreate.mockResolvedValue({
              choices: [{ message: { content: JSON.stringify(llmResult) } }],
            });

            const file = makePdfFile(pdfBuffer);
            const req = makeRequest(file);
            const res = await POST(req);

            // The route should return 200 with the parsed song data
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json).toHaveProperty("titel", titel);
            expect(json).toHaveProperty("kuenstler", kuenstler);
            expect(json).toHaveProperty("text", text);

            // pdf-parse should have been called
            expect(mockGetText).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 20 }
      );
    }
  );
});
