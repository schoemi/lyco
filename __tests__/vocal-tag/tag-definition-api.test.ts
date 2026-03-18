import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tagDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/tag-definitions/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const mockPrisma = vi.mocked(prisma);

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};
const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

const sampleTag = {
  id: "tag-1",
  tag: "belt",
  label: "Belting",
  icon: "fa-microphone",
  color: "#FF0000",
  indexNr: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(method: string, body?: Record<string, unknown>): NextRequest {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest("http://localhost/api/tag-definitions", opts);
}

describe("Tag-Definitions API (GET, POST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // --- Auth checks ---
  describe("Auth checks", () => {
    it("GET returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("POST returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("POST", { tag: "belt", label: "Belting", icon: "fa-mic", color: "#F00", indexNr: 1 });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("POST returns 403 for non-admin user", async () => {
      mockAuth.mockResolvedValue(userSession);
      const req = makeRequest("POST", { tag: "belt", label: "Belting", icon: "fa-mic", color: "#F00", indexNr: 1 });
      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Keine Berechtigung");
    });

    it("GET is allowed for non-admin authenticated user", async () => {
      mockAuth.mockResolvedValue(userSession);
      mockPrisma.tagDefinition.findMany.mockResolvedValue([]);
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  // --- GET /api/tag-definitions ---
  describe("GET /api/tag-definitions", () => {
    it("returns all tag definitions sorted by indexNr", async () => {
      const tags = [
        { ...sampleTag, indexNr: 1 },
        { ...sampleTag, id: "tag-2", tag: "vibrato", label: "Vibrato", indexNr: 2 },
      ];
      mockPrisma.tagDefinition.findMany.mockResolvedValue(tags);

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.definitions).toHaveLength(2);
      expect(json.definitions[0].tag).toBe("belt");
      expect(json.definitions[1].tag).toBe("vibrato");
    });

    it("returns empty array when no definitions exist", async () => {
      mockPrisma.tagDefinition.findMany.mockResolvedValue([]);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.definitions).toEqual([]);
    });

    it("returns 500 on unexpected error", async () => {
      mockPrisma.tagDefinition.findMany.mockRejectedValue(new Error("DB down"));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // --- POST /api/tag-definitions ---
  describe("POST /api/tag-definitions", () => {
    it("creates tag definition with valid data", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.tagDefinition.create.mockResolvedValue(sampleTag);

      const req = makeRequest("POST", {
        tag: "belt",
        label: "Belting",
        icon: "fa-microphone",
        color: "#FF0000",
        indexNr: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.definition.tag).toBe("belt");
    });

    it("returns 400 when tag field is missing", async () => {
      const req = makeRequest("POST", { label: "Belting", icon: "fa-mic", color: "#F00", indexNr: 1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("tag");
    });

    it("returns 400 when label field is missing", async () => {
      const req = makeRequest("POST", { tag: "belt", icon: "fa-mic", color: "#F00", indexNr: 1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("label");
    });

    it("returns 400 when icon field is missing", async () => {
      const req = makeRequest("POST", { tag: "belt", label: "Belting", color: "#F00", indexNr: 1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("icon");
    });

    it("returns 400 when color field is missing", async () => {
      const req = makeRequest("POST", { tag: "belt", label: "Belting", icon: "fa-mic", indexNr: 1 });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("color");
    });

    it("returns 400 when indexNr is missing", async () => {
      const req = makeRequest("POST", { tag: "belt", label: "Belting", icon: "fa-mic", color: "#F00" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("indexNr");
    });

    it("returns 400 when indexNr is not a number", async () => {
      const req = makeRequest("POST", { tag: "belt", label: "Belting", icon: "fa-mic", color: "#F00", indexNr: "abc" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("indexNr");
    });

    it("returns 409 on duplicate tag", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(sampleTag);

      const req = makeRequest("POST", {
        tag: "belt",
        label: "Belting",
        icon: "fa-microphone",
        color: "#FF0000",
        indexNr: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("Ein Tag mit diesem Kürzel existiert bereits");
    });

    it("returns 500 on unexpected error", async () => {
      mockPrisma.tagDefinition.findUnique.mockRejectedValue(new Error("DB down"));

      const req = makeRequest("POST", {
        tag: "belt",
        label: "Belting",
        icon: "fa-microphone",
        color: "#FF0000",
        indexNr: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
