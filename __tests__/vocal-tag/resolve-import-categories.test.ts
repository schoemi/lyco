import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TagKategorieData } from "@/types/vocal-tag";
import {
  resolveImportCategories,
  type TagConfigImportItem,
} from "@/lib/vocal-tag/resolve-import-categories";

// Mock the tag-kategorie-service
vi.mock("@/lib/services/tag-kategorie-service", () => ({
  findTagKategorieBySlug: vi.fn(),
  createTagKategorie: vi.fn(),
}));

import {
  findTagKategorieBySlug,
  createTagKategorie,
} from "@/lib/services/tag-kategorie-service";

const mockFindBySlug = vi.mocked(findTagKategorieBySlug);
const mockCreate = vi.mocked(createTagKategorie);

const makeKategorie = (slug: string, id: string): TagKategorieData => ({
  id,
  title: slug,
  slug,
  orderIndex: 0,
  _count: { tagDefinitions: 0 },
});

describe("resolveImportCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt null zurück für Items ohne category-Feld", async () => {
    const items: TagConfigImportItem[] = [
      { tag: "belt", label: "Belting", icon: "fa-fire", color: "#f00", indexNr: 1 },
    ];

    const result = await resolveImportCategories(items);

    expect(result.get("belt")).toBeNull();
    expect(mockFindBySlug).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("löst existierenden Kategorie-Slug auf", async () => {
    const existing = makeKategorie("technique", "cat-1");
    mockFindBySlug.mockResolvedValueOnce(existing);

    const items: TagConfigImportItem[] = [
      { tag: "belt", label: "Belting", icon: "fa-fire", color: "#f00", indexNr: 1, category: "technique" },
    ];

    const result = await resolveImportCategories(items);

    expect(result.get("belt")).toBe("cat-1");
    expect(mockFindBySlug).toHaveBeenCalledWith("technique");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("erstellt neue Kategorie für unbekannten Slug", async () => {
    mockFindBySlug.mockResolvedValueOnce(null);
    const created = makeKategorie("emotion", "cat-new");
    mockCreate.mockResolvedValueOnce(created);

    const items: TagConfigImportItem[] = [
      { tag: "trauer", label: "Trauer", icon: "fa-sad", color: "#00f", indexNr: 2, category: "emotion" },
    ];

    const result = await resolveImportCategories(items);

    expect(result.get("trauer")).toBe("cat-new");
    expect(mockFindBySlug).toHaveBeenCalledWith("emotion");
    expect(mockCreate).toHaveBeenCalledWith({ title: "emotion", slug: "emotion" });
  });

  it("cached Slug-Lookups für denselben Slug", async () => {
    const existing = makeKategorie("technique", "cat-1");
    mockFindBySlug.mockResolvedValueOnce(existing);

    const items: TagConfigImportItem[] = [
      { tag: "belt", label: "Belting", icon: "fa-fire", color: "#f00", indexNr: 1, category: "technique" },
      { tag: "falsett", label: "Falsett", icon: "fa-feather", color: "#00f", indexNr: 2, category: "technique" },
      { tag: "hauch", label: "Hauch", icon: "fa-wind", color: "#0f0", indexNr: 3, category: "technique" },
    ];

    const result = await resolveImportCategories(items);

    expect(result.get("belt")).toBe("cat-1");
    expect(result.get("falsett")).toBe("cat-1");
    expect(result.get("hauch")).toBe("cat-1");
    // findTagKategorieBySlug should only be called once due to caching
    expect(mockFindBySlug).toHaveBeenCalledTimes(1);
  });

  it("verarbeitet gemischte Items korrekt", async () => {
    const existingTechnique = makeKategorie("technique", "cat-1");
    mockFindBySlug.mockResolvedValueOnce(existingTechnique); // for "technique"
    mockFindBySlug.mockResolvedValueOnce(null); // for "emotion"
    const createdEmotion = makeKategorie("emotion", "cat-new");
    mockCreate.mockResolvedValueOnce(createdEmotion);

    const items: TagConfigImportItem[] = [
      { tag: "belt", label: "Belting", icon: "fa-fire", color: "#f00", indexNr: 1, category: "technique" },
      { tag: "trauer", label: "Trauer", icon: "fa-sad", color: "#00f", indexNr: 2, category: "emotion" },
      { tag: "neutral", label: "Neutral", icon: "fa-meh", color: "#999", indexNr: 3 },
    ];

    const result = await resolveImportCategories(items);

    expect(result.get("belt")).toBe("cat-1");
    expect(result.get("trauer")).toBe("cat-new");
    expect(result.get("neutral")).toBeNull();
    expect(result.size).toBe(3);
  });

  it("gibt leere Map für leeres Array zurück", async () => {
    const result = await resolveImportCategories([]);

    expect(result.size).toBe(0);
    expect(mockFindBySlug).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("cached auch neu erstellte Kategorien", async () => {
    mockFindBySlug.mockResolvedValueOnce(null);
    const created = makeKategorie("dynamics", "cat-dyn");
    mockCreate.mockResolvedValueOnce(created);

    const items: TagConfigImportItem[] = [
      { tag: "forte", label: "Forte", icon: "fa-volume-up", color: "#f00", indexNr: 1, category: "dynamics" },
      { tag: "piano", label: "Piano", icon: "fa-volume-down", color: "#00f", indexNr: 2, category: "dynamics" },
    ];

    const result = await resolveImportCategories(items);

    expect(result.get("forte")).toBe("cat-dyn");
    expect(result.get("piano")).toBe("cat-dyn");
    // Only one lookup and one create, second item uses cache
    expect(mockFindBySlug).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
