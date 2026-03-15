import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock pdf-parse
const mockPdfParse = vi.fn();
vi.mock("pdf-parse", () => ({
  default: (buffer: Buffer) => mockPdfParse(buffer),
}));

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

import { POST } from "../../src/app/api/songs/parse-pdf/route";
import { NextRequest } from "next/server";

const session = { user: { id: "user-1", email: "test@test.com", name: "Test" } };

function makePdfFile(size: number = 100): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], "test.pdf", { type: "application/pdf" });
}

function makeNonPdfFile(): File {
  return new File(["hello"], "test.txt", { type: "text/plain" });
}

function makeFormData(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  return form;
}

function makeRequest(formData: FormData): NextRequest {
  return new NextRequest("http://localhost/api/songs/parse-pdf", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/songs/parse-pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    const req = makeRequest(makeFormData(makePdfFile()));
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-PDF file type", async () => {
    mockAuth.mockResolvedValue(session);
    const req = makeRequest(makeFormData(makeNonPdfFile()));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("PDF");
  });

  it("returns 400 for file exceeding 5MB", async () => {
    mockAuth.mockResolvedValue(session);
    const largeFile = makePdfFile(6 * 1024 * 1024);
    const req = makeRequest(makeFormData(largeFile));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("5MB");
  });

  it("returns parsed result on successful flow", async () => {
    mockAuth.mockResolvedValue(session);
    mockPdfParse.mockResolvedValue({ text: "Some song lyrics" });

    const llmResult = {
      titel: "Test Song",
      kuenstler: "Test Artist",
      text: "[Verse 1]\nLine one",
    };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(llmResult) } }],
    });

    const req = makeRequest(makeFormData(makePdfFile()));
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.titel).toBe("Test Song");
    expect(json.kuenstler).toBe("Test Artist");
    expect(json.text).toBe("[Verse 1]\nLine one");
  });
});
