/**
 * Unit-Tests für Kategorie-API und Service
 *
 * API-Endpunkte: GET, POST, PUT, DELETE, Validierung, Fehlerbehandlung
 * Service: getAllTagKategorien, createTagKategorie, updateTagKategorie, deleteTagKategorie
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tagKategorie: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tag-categories/route";
import { PUT, DELETE } from "@/app/api/tag-categories/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  getAllTagKategorien,
  createTagKategorie,
  updateTagKategorie,
  deleteTagKategorie,
} from "@/lib/services/tag-kategorie-service";

const mockPrisma = vi.mocked(prisma);

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};

const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

const sampleKategorie = {
  id: "kat-1",
  title: "Technik",
  slug: "technik",
  orderIndex: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { tagDefinitions: 3 },
};

const sampleKategorie2 = {
  id: "kat-2",
  title: "Emotion",
  slug: "emotion",
  orderIndex: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { tagDefinitions: 1 },
};

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/tag-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePutRequest(id: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/tag-categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/tag-categories/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// Service-Layer Tests
// ============================================================

describe("TagKategorieService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getAllTagKategorien (Req 2.7) ---

  describe("getAllTagKategorien", () => {
    it("returns all categories sorted by orderIndex ascending", async () => {
      const kategorien = [
        { ...sampleKategorie, orderIndex: 0 },
        { ...sampleKategorie2, orderIndex: 1 },
      ];
      mockPrisma.tagKategorie.findMany.mockResolvedValue(kategorien as any);

      const result = await getAllTagKategorien();

      expect(mockPrisma.tagKategorie.findMany).toHaveBeenCalledWith({
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { tagDefinitions: true } } },
      });
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("technik");
      expect(result[1].slug).toBe("emotion");
    });

    it("returns mapped TagKategorieData with _count", async () => {
      mockPrisma.tagKategorie.findMany.mockResolvedValue([sampleKategorie] as any);

      const result = await getAllTagKategorien();

      expect(result[0]).toEqual({
        id: "kat-1",
        title: "Technik",
        slug: "technik",
        orderIndex: 0,
        _count: { tagDefinitions: 3 },
      });
      expect(result[0]).not.toHaveProperty("createdAt");
      expect(result[0]).not.toHaveProperty("updatedAt");
    });

    it("returns empty array when no categories exist", async () => {
      mockPrisma.tagKategorie.findMany.mockResolvedValue([]);

      const result = await getAllTagKategorien();

      expect(result).toEqual([]);
    });
  });

  // --- createTagKategorie (Req 2.1, 2.4) ---

  describe("createTagKategorie", () => {
    it("creates a new category with all fields", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);
      mockPrisma.tagKategorie.create.mockResolvedValue(sampleKategorie as any);

      const result = await createTagKategorie({
        title: "Technik",
        slug: "technik",
        orderIndex: 0,
      });

      expect(mockPrisma.tagKategorie.create).toHaveBeenCalledWith({
        data: { title: "Technik", slug: "technik", orderIndex: 0 },
        include: { _count: { select: { tagDefinitions: true } } },
      });
      expect(result.title).toBe("Technik");
      expect(result.slug).toBe("technik");
    });

    it("defaults orderIndex to 0 when not provided", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);
      mockPrisma.tagKategorie.create.mockResolvedValue(sampleKategorie as any);

      await createTagKategorie({ title: "Technik", slug: "technik" });

      expect(mockPrisma.tagKategorie.create).toHaveBeenCalledWith({
        data: { title: "Technik", slug: "technik", orderIndex: 0 },
        include: { _count: { select: { tagDefinitions: true } } },
      });
    });

    it("throws error when slug already exists", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(sampleKategorie as any);

      await expect(
        createTagKategorie({ title: "Technik Neu", slug: "technik" })
      ).rejects.toThrow("Eine Kategorie mit diesem Slug existiert bereits");
      expect(mockPrisma.tagKategorie.create).not.toHaveBeenCalled();
    });
  });

  // --- updateTagKategorie (Req 2.2) ---

  describe("updateTagKategorie", () => {
    it("updates specified fields only", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(sampleKategorie as any);
      mockPrisma.tagKategorie.update.mockResolvedValue({
        ...sampleKategorie,
        title: "Technik Neu",
      } as any);

      const result = await updateTagKategorie("kat-1", { title: "Technik Neu" });

      expect(mockPrisma.tagKategorie.update).toHaveBeenCalledWith({
        where: { id: "kat-1" },
        data: { title: "Technik Neu" },
        include: { _count: { select: { tagDefinitions: true } } },
      });
      expect(result.title).toBe("Technik Neu");
    });

    it("throws error when category not found", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);

      await expect(
        updateTagKategorie("non-existent", { title: "X" })
      ).rejects.toThrow("Tag-Kategorie nicht gefunden");
      expect(mockPrisma.tagKategorie.update).not.toHaveBeenCalled();
    });

    it("throws error when updating slug to an existing one", async () => {
      mockPrisma.tagKategorie.findUnique
        .mockResolvedValueOnce(sampleKategorie as any) // existing category
        .mockResolvedValueOnce(sampleKategorie2 as any); // slug conflict

      await expect(
        updateTagKategorie("kat-1", { slug: "emotion" })
      ).rejects.toThrow("Eine Kategorie mit diesem Slug existiert bereits");
      expect(mockPrisma.tagKategorie.update).not.toHaveBeenCalled();
    });

    it("allows updating slug when no conflict exists", async () => {
      mockPrisma.tagKategorie.findUnique
        .mockResolvedValueOnce(sampleKategorie as any) // existing category
        .mockResolvedValueOnce(null); // no slug conflict
      mockPrisma.tagKategorie.update.mockResolvedValue({
        ...sampleKategorie,
        slug: "new-slug",
      } as any);

      const result = await updateTagKategorie("kat-1", { slug: "new-slug" });

      expect(result.slug).toBe("new-slug");
    });
  });

  // --- deleteTagKategorie (Req 2.3) ---

  describe("deleteTagKategorie", () => {
    it("deletes category and returns affectedTags count", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(sampleKategorie as any);
      mockPrisma.tagKategorie.delete.mockResolvedValue(sampleKategorie as any);

      const result = await deleteTagKategorie("kat-1");

      expect(result).toEqual({ deleted: true, affectedTags: 3 });
      expect(mockPrisma.tagKategorie.delete).toHaveBeenCalledWith({
        where: { id: "kat-1" },
      });
    });

    it("returns affectedTags 0 when category has no tags", async () => {
      const emptyKategorie = {
        ...sampleKategorie,
        _count: { tagDefinitions: 0 },
      };
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(emptyKategorie as any);
      mockPrisma.tagKategorie.delete.mockResolvedValue(emptyKategorie as any);

      const result = await deleteTagKategorie("kat-1");

      expect(result).toEqual({ deleted: true, affectedTags: 0 });
    });

    it("throws error when category not found", async () => {
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);

      await expect(deleteTagKategorie("non-existent")).rejects.toThrow(
        "Tag-Kategorie nicht gefunden"
      );
      expect(mockPrisma.tagKategorie.delete).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// API Route Tests
// ============================================================

describe("Kategorie-API-Endpunkte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- GET /api/tag-categories (Req 2.7) ---

  describe("GET /api/tag-categories", () => {
    it("returns all categories sorted by orderIndex (200)", async () => {
      mockAuth.mockResolvedValue(userSession);
      mockPrisma.tagKategorie.findMany.mockResolvedValue([
        sampleKategorie,
        sampleKategorie2,
      ] as any);

      const res = await GET();

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.categories).toHaveLength(2);
      expect(json.categories[0].slug).toBe("technik");
      expect(json.categories[1].slug).toBe("emotion");
    });

    it("returns 401 for unauthenticated users", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await GET();

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Nicht authentifiziert");
    });
  });

  // --- POST /api/tag-categories (Req 2.1, 2.4, 2.5, 2.6) ---

  describe("POST /api/tag-categories", () => {
    it("creates a category and returns 201", async () => {
      mockAuth.mockResolvedValue(adminSession);
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);
      mockPrisma.tagKategorie.create.mockResolvedValue(sampleKategorie as any);

      const req = makePostRequest({
        title: "Technik",
        slug: "technik",
        orderIndex: 0,
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.category.title).toBe("Technik");
      expect(json.category.slug).toBe("technik");
    });

    it("returns 400 for missing title", async () => {
      mockAuth.mockResolvedValue(adminSession);

      const req = makePostRequest({ slug: "technik" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Feld 'title' ist erforderlich");
    });

    it("returns 400 for missing slug", async () => {
      mockAuth.mockResolvedValue(adminSession);

      const req = makePostRequest({ title: "Technik" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Feld 'slug' ist erforderlich");
    });

    it("returns 400 for empty title", async () => {
      mockAuth.mockResolvedValue(adminSession);

      const req = makePostRequest({ title: "", slug: "technik" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Feld 'title' ist erforderlich");
    });

    it("returns 409 for duplicate slug", async () => {
      mockAuth.mockResolvedValue(adminSession);
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(sampleKategorie as any);

      const req = makePostRequest({ title: "Technik Neu", slug: "technik" });
      const res = await POST(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe(
        "Eine Kategorie mit diesem Slug existiert bereits"
      );
    });

    it("returns 403 for non-ADMIN user", async () => {
      mockAuth.mockResolvedValue(userSession);

      const req = makePostRequest({ title: "Technik", slug: "technik" });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Keine Berechtigung");
    });

    it("returns 401 for unauthenticated user", async () => {
      mockAuth.mockResolvedValue(null);

      const req = makePostRequest({ title: "Technik", slug: "technik" });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Nicht authentifiziert");
    });
  });

  // --- PUT /api/tag-categories/[id] (Req 2.2, 2.6) ---

  describe("PUT /api/tag-categories/[id]", () => {
    it("updates a category and returns 200", async () => {
      mockAuth.mockResolvedValue(adminSession);
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(sampleKategorie as any);
      mockPrisma.tagKategorie.update.mockResolvedValue({
        ...sampleKategorie,
        title: "Technik Aktualisiert",
        _count: { tagDefinitions: 3 },
      } as any);

      const req = makePutRequest("kat-1", { title: "Technik Aktualisiert" });
      const res = await PUT(req, { params: Promise.resolve({ id: "kat-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.category.title).toBe("Technik Aktualisiert");
    });

    it("returns 404 for non-existent category", async () => {
      mockAuth.mockResolvedValue(adminSession);
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);

      const req = makePutRequest("non-existent", { title: "X" });
      const res = await PUT(req, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Tag-Kategorie nicht gefunden");
    });

    it("returns 409 for slug conflict on update", async () => {
      mockAuth.mockResolvedValue(adminSession);
      // First findUnique: the category being updated
      mockPrisma.tagKategorie.findUnique
        .mockResolvedValueOnce(sampleKategorie as any)
        // Second findUnique: slug conflict check
        .mockResolvedValueOnce(sampleKategorie2 as any);

      const req = makePutRequest("kat-1", { slug: "emotion" });
      const res = await PUT(req, { params: Promise.resolve({ id: "kat-1" }) });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe(
        "Eine Kategorie mit diesem Slug existiert bereits"
      );
    });

    it("returns 403 for non-ADMIN user", async () => {
      mockAuth.mockResolvedValue(userSession);

      const req = makePutRequest("kat-1", { title: "X" });
      const res = await PUT(req, { params: Promise.resolve({ id: "kat-1" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Keine Berechtigung");
    });
  });

  // --- DELETE /api/tag-categories/[id] (Req 2.3, 2.6) ---

  describe("DELETE /api/tag-categories/[id]", () => {
    it("deletes a category and returns affectedTags (200)", async () => {
      mockAuth.mockResolvedValue(adminSession);
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(sampleKategorie as any);
      mockPrisma.tagKategorie.delete.mockResolvedValue(sampleKategorie as any);

      const req = makeDeleteRequest("kat-1");
      const res = await DELETE(req, {
        params: Promise.resolve({ id: "kat-1" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
      expect(json.affectedTags).toBe(3);
    });

    it("returns 404 for non-existent category", async () => {
      mockAuth.mockResolvedValue(adminSession);
      mockPrisma.tagKategorie.findUnique.mockResolvedValue(null);

      const req = makeDeleteRequest("non-existent");
      const res = await DELETE(req, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Tag-Kategorie nicht gefunden");
    });

    it("returns 403 for non-ADMIN user", async () => {
      mockAuth.mockResolvedValue(userSession);

      const req = makeDeleteRequest("kat-1");
      const res = await DELETE(req, {
        params: Promise.resolve({ id: "kat-1" }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Keine Berechtigung");
    });
  });
});
