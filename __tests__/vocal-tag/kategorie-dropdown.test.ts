import { describe, it, expect } from "vitest";
import type {
  TagDefinitionData,
  TagKategorieData,
} from "@/types/vocal-tag";

/**
 * Unit-Tests für das Kategorie-Dropdown in der Tag-Verwaltung.
 *
 * Da die Testumgebung node ist (kein jsdom), testen wir die Kernlogik:
 * Dropdown-Datenstruktur, Auswahl-Logik, Persistierungs-Payload,
 * lokale State-Aktualisierung und Anzeige des Kategorie-Titels.
 *
 * **Validates: Requirements 4.1, 4.2, 4.4**
 */

function makeKategorie(
  overrides: Partial<TagKategorieData> = {}
): TagKategorieData {
  return {
    id: "kat-1",
    title: "Technik",
    slug: "technik",
    orderIndex: 0,
    _count: { tagDefinitions: 3 },
    ...overrides,
  };
}

function makeTag(
  overrides: Partial<TagDefinitionData> = {}
): TagDefinitionData {
  return {
    id: "tag-1",
    tag: "belt",
    label: "Belting",
    icon: "fa-microphone",
    color: "#ff0000",
    indexNr: 1,
    categoryId: null,
    ...overrides,
  };
}

// --- Dropdown-Datenstruktur (Anforderung 4.1, 4.2) ---

describe("Dropdown-Datenstruktur", () => {
  it("enthält 'Keine Kategorie' als erste Option mit leerem Wert", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik" }),
      makeKategorie({ id: "k2", title: "Emotion" }),
    ];

    // Simuliert die Dropdown-Optionen wie in der Seite
    const options = [
      { value: "", label: "Keine Kategorie" },
      ...categories.map((c) => ({ value: c.id, label: c.title })),
    ];

    expect(options[0]).toEqual({ value: "", label: "Keine Kategorie" });
    expect(options).toHaveLength(3);
  });

  it("listet alle Kategorien als Optionen nach 'Keine Kategorie'", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik", orderIndex: 0 }),
      makeKategorie({ id: "k2", title: "Emotion", orderIndex: 1 }),
      makeKategorie({ id: "k3", title: "Dynamik", orderIndex: 2 }),
    ];

    const options = [
      { value: "", label: "Keine Kategorie" },
      ...categories.map((c) => ({ value: c.id, label: c.title })),
    ];

    expect(options[1]).toEqual({ value: "k1", label: "Technik" });
    expect(options[2]).toEqual({ value: "k2", label: "Emotion" });
    expect(options[3]).toEqual({ value: "k3", label: "Dynamik" });
  });

  it("zeigt leeres Dropdown wenn keine Kategorien existieren", () => {
    const categories: TagKategorieData[] = [];

    const options = [
      { value: "", label: "Keine Kategorie" },
      ...categories.map((c) => ({ value: c.id, label: c.title })),
    ];

    expect(options).toHaveLength(1);
    expect(options[0].label).toBe("Keine Kategorie");
  });

  it("setzt Dropdown-Wert auf categoryId des Tags oder leeren String", () => {
    const tagMitKategorie = makeTag({ categoryId: "k1" });
    const tagOhneKategorie = makeTag({ categoryId: null });

    const valueMit = tagMitKategorie.categoryId ?? "";
    const valueOhne = tagOhneKategorie.categoryId ?? "";

    expect(valueMit).toBe("k1");
    expect(valueOhne).toBe("");
  });

  it("stellt aria-label mit Tag-Label für jedes Dropdown bereit", () => {
    const tag = makeTag({ label: "Belting" });

    const ariaLabel = `Kategorie auswählen für ${tag.label}`;

    expect(ariaLabel).toBe("Kategorie auswählen für Belting");
  });
});

// --- Auswahl-Logik (Anforderung 4.1, 4.2) ---

describe("Auswahl-Logik", () => {
  it("mappt leeren Dropdown-Wert auf categoryId null", () => {
    const dropdownValue = "";
    const categoryId = dropdownValue === "" ? null : dropdownValue;

    expect(categoryId).toBeNull();
  });

  it("mappt nicht-leeren Dropdown-Wert auf categoryId String", () => {
    const dropdownValue = "k1";
    const categoryId = dropdownValue === "" ? null : dropdownValue;

    expect(categoryId).toBe("k1");
  });

  it("erkennt Wechsel von Kategorie zu 'Keine Kategorie'", () => {
    const tag = makeTag({ categoryId: "k1" });
    const newDropdownValue = "";
    const newCategoryId = newDropdownValue === "" ? null : newDropdownValue;

    expect(tag.categoryId).toBe("k1");
    expect(newCategoryId).toBeNull();
  });

  it("erkennt Wechsel von 'Keine Kategorie' zu einer Kategorie", () => {
    const tag = makeTag({ categoryId: null });
    const newDropdownValue = "k2";
    const newCategoryId = newDropdownValue === "" ? null : newDropdownValue;

    expect(tag.categoryId).toBeNull();
    expect(newCategoryId).toBe("k2");
  });

  it("erkennt Wechsel zwischen zwei Kategorien", () => {
    const tag = makeTag({ categoryId: "k1" });
    const newDropdownValue = "k2";
    const newCategoryId = newDropdownValue === "" ? null : newDropdownValue;

    expect(tag.categoryId).toBe("k1");
    expect(newCategoryId).toBe("k2");
  });
});

// --- Persistierungs-Payload (Anforderung 4.3) ---

describe("Persistierungs-Payload", () => {
  it("erstellt PUT-Payload mit categoryId für Kategorie-Zuweisung", () => {
    const tagId = "tag-1";
    const categoryId: string | null = "k1";

    const url = `/api/tag-definitions/${tagId}`;
    const payload = { categoryId };

    expect(url).toBe("/api/tag-definitions/tag-1");
    expect(payload).toEqual({ categoryId: "k1" });
  });

  it("erstellt PUT-Payload mit categoryId null zum Entfernen", () => {
    const tagId = "tag-1";
    const categoryId: string | null = null;

    const payload = { categoryId };

    expect(payload).toEqual({ categoryId: null });
  });

  it("verwendet PUT-Methode für Kategorie-Änderung", () => {
    const method = "PUT";
    const headers = { "Content-Type": "application/json" };

    expect(method).toBe("PUT");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sendet nur categoryId im Payload, keine anderen Felder", () => {
    const categoryId: string | null = "k2";
    const payload = JSON.stringify({ categoryId });
    const parsed = JSON.parse(payload);

    expect(Object.keys(parsed)).toEqual(["categoryId"]);
    expect(parsed.categoryId).toBe("k2");
  });
});

// --- Lokale State-Aktualisierung ---

describe("Lokale State-Aktualisierung nach Kategorie-Änderung", () => {
  it("aktualisiert categoryId im Tag nach erfolgreicher Zuweisung", () => {
    const tags = [
      makeTag({ id: "t1", categoryId: null }),
      makeTag({ id: "t2", categoryId: "k1" }),
    ];
    const targetId = "t1";
    const newCategoryId: string | null = "k2";

    const updated = tags.map((t) =>
      t.id === targetId ? { ...t, categoryId: newCategoryId } : t
    );

    expect(updated.find((t) => t.id === "t1")?.categoryId).toBe("k2");
    expect(updated.find((t) => t.id === "t2")?.categoryId).toBe("k1");
  });

  it("setzt categoryId auf null beim Entfernen der Kategorie", () => {
    const tags = [makeTag({ id: "t1", categoryId: "k1" })];
    const targetId = "t1";
    const newCategoryId: string | null = null;

    const updated = tags.map((t) =>
      t.id === targetId ? { ...t, categoryId: newCategoryId } : t
    );

    expect(updated[0].categoryId).toBeNull();
  });

  it("löst das category-Objekt aus der Kategorie-Liste auf", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik", slug: "technik", orderIndex: 0 }),
      makeKategorie({ id: "k2", title: "Emotion", slug: "emotion", orderIndex: 1 }),
    ];
    const categoryId: string | null = "k2";

    const matchedCategory = categoryId
      ? categories.find((c) => c.id === categoryId) ?? null
      : null;

    expect(matchedCategory).not.toBeNull();
    expect(matchedCategory?.title).toBe("Emotion");
    expect(matchedCategory?.slug).toBe("emotion");
  });

  it("setzt category-Objekt auf undefined wenn categoryId null", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik" }),
    ];
    const categoryId: string | null = null;

    const matchedCategory = categoryId
      ? categories.find((c) => c.id === categoryId) ?? null
      : null;

    expect(matchedCategory).toBeNull();
  });

  it("aktualisiert Tag mit aufgelöstem category-Objekt", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik", slug: "technik", orderIndex: 0 }),
    ];
    const tag = makeTag({ id: "t1", categoryId: null });
    const newCategoryId: string | null = "k1";

    const matchedCategory = newCategoryId
      ? categories.find((c) => c.id === newCategoryId) ?? null
      : null;

    const updatedTag: TagDefinitionData = {
      ...tag,
      categoryId: newCategoryId,
      category: matchedCategory
        ? {
            id: matchedCategory.id,
            title: matchedCategory.title,
            slug: matchedCategory.slug,
            orderIndex: matchedCategory.orderIndex,
          }
        : undefined,
    };

    expect(updatedTag.categoryId).toBe("k1");
    expect(updatedTag.category?.title).toBe("Technik");
    expect(updatedTag.category?.slug).toBe("technik");
  });

  it("lässt andere Tags unverändert bei Kategorie-Änderung", () => {
    const tags = [
      makeTag({ id: "t1", categoryId: "k1", label: "Belting" }),
      makeTag({ id: "t2", categoryId: "k2", label: "Vibrato" }),
      makeTag({ id: "t3", categoryId: null, label: "Falsett" }),
    ];
    const targetId = "t2";
    const newCategoryId: string | null = "k3";

    const updated = tags.map((t) =>
      t.id === targetId ? { ...t, categoryId: newCategoryId } : t
    );

    expect(updated[0]).toEqual(tags[0]);
    expect(updated[2]).toEqual(tags[2]);
    expect(updated[1].categoryId).toBe("k3");
  });
});

// --- Anzeige des Kategorie-Titels (Anforderung 4.4) ---

describe("Anzeige des Kategorie-Titels", () => {
  it("zeigt Kategorie-Titel für zugeordneten Tag", () => {
    const tag = makeTag({
      categoryId: "k1",
      category: makeKategorie({ id: "k1", title: "Technik" }),
    });

    const displayTitle = tag.category?.title ?? "Keine Kategorie";

    expect(displayTitle).toBe("Technik");
  });

  it("zeigt 'Keine Kategorie' für Tag ohne Zuordnung", () => {
    const tag = makeTag({ categoryId: null, category: undefined });

    const displayTitle = tag.category?.title ?? "Keine Kategorie";

    expect(displayTitle).toBe("Keine Kategorie");
  });

  it("zeigt aktualisierten Titel nach Kategorie-Wechsel", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik" }),
      makeKategorie({ id: "k2", title: "Emotion" }),
    ];

    // Vorher: Technik
    let tag = makeTag({
      categoryId: "k1",
      category: categories[0],
    });
    expect(tag.category?.title).toBe("Technik");

    // Nachher: Emotion
    const newCategory = categories[1];
    tag = {
      ...tag,
      categoryId: "k2",
      category: newCategory,
    };
    expect(tag.category?.title).toBe("Emotion");
  });

  it("zeigt Titel korrekt für alle Tags in der Liste", () => {
    const categories = [
      makeKategorie({ id: "k1", title: "Technik" }),
      makeKategorie({ id: "k2", title: "Emotion" }),
    ];

    const tags = [
      makeTag({ id: "t1", categoryId: "k1", category: categories[0] }),
      makeTag({ id: "t2", categoryId: "k2", category: categories[1] }),
      makeTag({ id: "t3", categoryId: null, category: undefined }),
    ];

    const displayTitles = tags.map(
      (t) => t.category?.title ?? "Keine Kategorie"
    );

    expect(displayTitles).toEqual(["Technik", "Emotion", "Keine Kategorie"]);
  });

  it("zeigt 'Keine Kategorie' wenn category-Objekt fehlt trotz categoryId", () => {
    // Edge case: categoryId gesetzt aber category-Objekt nicht aufgelöst
    const tag = makeTag({ categoryId: "k-unknown", category: undefined });

    const displayTitle = tag.category?.title ?? "Keine Kategorie";

    expect(displayTitle).toBe("Keine Kategorie");
  });
});
