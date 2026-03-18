import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tagDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    zeile: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getAllTagDefinitions,
  createTagDefinition,
  updateTagDefinition,
  deleteTagDefinition,
  countSongsUsingTag,
} from "@/lib/services/tag-definition-service";

const mockPrisma = vi.mocked(prisma);

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

describe("TagDefinitionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getAllTagDefinitions (Req 2.7) ---

  describe("getAllTagDefinitions", () => {
    it("returns all definitions sorted by indexNr ascending", async () => {
      const tags = [
        { ...sampleTag, indexNr: 1 },
        { ...sampleTag, id: "tag-2", tag: "vibrato", label: "Vibrato", indexNr: 2 },
      ];
      mockPrisma.tagDefinition.findMany.mockResolvedValue(tags as any);

      const result = await getAllTagDefinitions();

      expect(mockPrisma.tagDefinition.findMany).toHaveBeenCalledWith({
        orderBy: { indexNr: "asc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].tag).toBe("belt");
      expect(result[1].tag).toBe("vibrato");
    });

    it("returns mapped TagDefinitionData without createdAt/updatedAt", async () => {
      mockPrisma.tagDefinition.findMany.mockResolvedValue([sampleTag] as any);

      const result = await getAllTagDefinitions();

      expect(result[0]).toEqual({
        id: "tag-1",
        tag: "belt",
        label: "Belting",
        icon: "fa-microphone",
        color: "#FF0000",
        indexNr: 1,
      });
      expect(result[0]).not.toHaveProperty("createdAt");
      expect(result[0]).not.toHaveProperty("updatedAt");
    });

    it("returns empty array when no definitions exist", async () => {
      mockPrisma.tagDefinition.findMany.mockResolvedValue([]);

      const result = await getAllTagDefinitions();

      expect(result).toEqual([]);
    });
  });

  // --- createTagDefinition (Req 2.1, 2.5) ---

  describe("createTagDefinition", () => {
    const input = {
      tag: "belt",
      label: "Belting",
      icon: "fa-microphone",
      color: "#FF0000",
      indexNr: 1,
    };

    it("creates a new tag definition with all fields", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.tagDefinition.create.mockResolvedValue(sampleTag as any);

      const result = await createTagDefinition(input);

      expect(mockPrisma.tagDefinition.create).toHaveBeenCalledWith({
        data: {
          tag: "belt",
          label: "Belting",
          icon: "fa-microphone",
          color: "#FF0000",
          indexNr: 1,
        },
      });
      expect(result.tag).toBe("belt");
      expect(result.label).toBe("Belting");
    });

    it("throws error when tag with same kürzel already exists", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(sampleTag as any);

      await expect(createTagDefinition(input)).rejects.toThrow(
        "Ein Tag mit diesem Kürzel existiert bereits"
      );
      expect(mockPrisma.tagDefinition.create).not.toHaveBeenCalled();
    });

    it("checks uniqueness by tag field", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.tagDefinition.create.mockResolvedValue(sampleTag as any);

      await createTagDefinition(input);

      expect(mockPrisma.tagDefinition.findUnique).toHaveBeenCalledWith({
        where: { tag: "belt" },
      });
    });
  });

  // --- updateTagDefinition (Req 2.2) ---

  describe("updateTagDefinition", () => {
    it("updates specified fields only", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(sampleTag as any);
      mockPrisma.tagDefinition.update.mockResolvedValue({
        ...sampleTag,
        label: "Belting Neu",
        color: "#00FF00",
      } as any);

      const result = await updateTagDefinition("tag-1", {
        label: "Belting Neu",
        color: "#00FF00",
      });

      expect(mockPrisma.tagDefinition.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: { label: "Belting Neu", color: "#00FF00" },
      });
      expect(result.label).toBe("Belting Neu");
      expect(result.color).toBe("#00FF00");
    });

    it("throws error when tag definition not found", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);

      await expect(
        updateTagDefinition("non-existent", { label: "X" })
      ).rejects.toThrow("Tag-Definition nicht gefunden");
      expect(mockPrisma.tagDefinition.update).not.toHaveBeenCalled();
    });

    it("updates only indexNr when only indexNr is provided", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(sampleTag as any);
      mockPrisma.tagDefinition.update.mockResolvedValue({
        ...sampleTag,
        indexNr: 5,
      } as any);

      await updateTagDefinition("tag-1", { indexNr: 5 });

      expect(mockPrisma.tagDefinition.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: { indexNr: 5 },
      });
    });
  });

  // --- deleteTagDefinition (Req 2.3, 2.4) ---

  describe("deleteTagDefinition", () => {
    it("deletes tag and returns affected songs count of 0", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(sampleTag as any);
      mockPrisma.zeile.findMany.mockResolvedValue([]);
      mockPrisma.tagDefinition.delete.mockResolvedValue(sampleTag as any);

      const result = await deleteTagDefinition("tag-1");

      expect(result).toEqual({ deleted: true, affectedSongs: 0 });
      expect(mockPrisma.tagDefinition.delete).toHaveBeenCalledWith({
        where: { id: "tag-1" },
      });
    });

    it("returns warning with affected songs count when tag is used", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(sampleTag as any);
      mockPrisma.zeile.findMany.mockResolvedValue([
        { strophe: { songId: "song-1" } },
        { strophe: { songId: "song-1" } },
        { strophe: { songId: "song-2" } },
      ] as any);
      mockPrisma.tagDefinition.delete.mockResolvedValue(sampleTag as any);

      const result = await deleteTagDefinition("tag-1");

      expect(result).toEqual({ deleted: true, affectedSongs: 2 });
    });

    it("throws error when tag definition not found", async () => {
      mockPrisma.tagDefinition.findUnique.mockResolvedValue(null);

      await expect(deleteTagDefinition("non-existent")).rejects.toThrow(
        "Tag-Definition nicht gefunden"
      );
      expect(mockPrisma.tagDefinition.delete).not.toHaveBeenCalled();
    });
  });

  // --- countSongsUsingTag ---

  describe("countSongsUsingTag", () => {
    it("counts distinct songs containing the tag pattern", async () => {
      mockPrisma.zeile.findMany.mockResolvedValue([
        { strophe: { songId: "song-1" } },
        { strophe: { songId: "song-2" } },
        { strophe: { songId: "song-1" } },
      ] as any);

      const count = await countSongsUsingTag("belt");

      expect(mockPrisma.zeile.findMany).toHaveBeenCalledWith({
        where: { text: { contains: "{belt:" } },
        select: { strophe: { select: { songId: true } } },
      });
      expect(count).toBe(2);
    });

    it("returns 0 when no songs use the tag", async () => {
      mockPrisma.zeile.findMany.mockResolvedValue([]);

      const count = await countSongsUsingTag("unused");

      expect(count).toBe(0);
    });
  });
});
