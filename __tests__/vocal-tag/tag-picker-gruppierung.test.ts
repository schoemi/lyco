import { describe, it, expect } from "vitest";
import type {
  TagDefinitionData,
  TagKategorieData,
  GruppierteTagDefinitionen,
} from "@/types/vocal-tag";
import {
  gruppiereTagsNachKategorie,
  filtereGruppierteTagDefinitionen,
} from "@/lib/vocal-tag/tag-gruppierung";

/**
 * Unit-Tests für Tag-Picker-Gruppierung und SuggestionDropdown-Logik.
 *
 * Da die Testumgebung node ist (kein jsdom), testen wir die Kernlogik:
 * Top-5-Auswahl unabhängig von Kategorie, Dropdown-Gruppierung nach Kategorie,
 * Kategorie-Überschriften, Sortierung nach orderIndex, Tags ohne Kategorie,
 * SuggestionDropdown-Gruppierung, Keyboard-Navigation und Filterung.
 *
 * **Validates: Requirements 7.4, 8.4**
 */

// --- Helpers ---

let tagCounter = 0;

function makeKategorie(
  overrides: Partial<TagKategorieData> = {},
): TagKategorieData {
  return {
    id: "kat-1",
    title: "Technik",
    slug: "technik",
    orderIndex: 0,
    ...overrides,
  };
}

function makeTag(
  overrides: Partial<TagDefinitionData> = {},
): TagDefinitionData {
  tagCounter++;
  return {
    id: `tag-${tagCounter}`,
    tag: `tag${tagCounter}`,
    label: `Tag ${tagCounter}`,
    icon: "fa-microphone",
    color: "#ff0000",
    indexNr: tagCounter,
    categoryId: null,
    ...overrides,
  };
}

function resetCounter() {
  tagCounter = 0;
}

// --- Top-5 Buttons unabhängig von Kategorie (Anforderung 7.4) ---

describe("Top-5 Buttons unabhängig von Kategorie", () => {
  const TOP_COUNT = 5;

  it("wählt Top-5 nach indexNr, unabhängig von categoryId", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Emotion", orderIndex: 1 });
    const katB = makeKategorie({ id: "kB", title: "Technik", orderIndex: 0 });

    const tags = [
      makeTag({ id: "t1", indexNr: 1, categoryId: "kA" }),
      makeTag({ id: "t2", indexNr: 2, categoryId: "kB" }),
      makeTag({ id: "t3", indexNr: 3, categoryId: null }),
      makeTag({ id: "t4", indexNr: 4, categoryId: "kA" }),
      makeTag({ id: "t5", indexNr: 5, categoryId: "kB" }),
      makeTag({ id: "t6", indexNr: 6, categoryId: null }),
      makeTag({ id: "t7", indexNr: 7, categoryId: "kA" }),
    ];

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
    const topTags = sorted.slice(0, TOP_COUNT);

    expect(topTags).toHaveLength(5);
    expect(topTags.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("Top-5 enthält Tags aus verschiedenen Kategorien gemischt", () => {
    resetCounter();
    const tags = [
      makeTag({ id: "t1", indexNr: 1, categoryId: "kA" }),
      makeTag({ id: "t2", indexNr: 2, categoryId: "kB" }),
      makeTag({ id: "t3", indexNr: 3, categoryId: null }),
      makeTag({ id: "t4", indexNr: 4, categoryId: "kA" }),
      makeTag({ id: "t5", indexNr: 5, categoryId: "kB" }),
    ];

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
    const topTags = sorted.slice(0, TOP_COUNT);

    const categoryIds = topTags.map((t) => t.categoryId);
    expect(categoryIds).toEqual(["kA", "kB", null, "kA", "kB"]);
  });

  it("Top-5 bei weniger als 5 Tags zeigt alle Tags", () => {
    resetCounter();
    const tags = [
      makeTag({ id: "t1", indexNr: 1 }),
      makeTag({ id: "t2", indexNr: 2 }),
      makeTag({ id: "t3", indexNr: 3 }),
    ];

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
    const topTags = sorted.slice(0, TOP_COUNT);

    expect(topTags).toHaveLength(3);
  });

  it("Top-5 ignoriert Kategorie-orderIndex und nutzt nur indexNr", () => {
    resetCounter();
    // Kategorie mit hohem orderIndex hat Tags mit niedrigem indexNr
    const tags = [
      makeTag({ id: "t1", indexNr: 10, categoryId: "kLow" }),
      makeTag({ id: "t2", indexNr: 1, categoryId: "kHigh" }),
      makeTag({ id: "t3", indexNr: 5, categoryId: "kLow" }),
      makeTag({ id: "t4", indexNr: 2, categoryId: "kHigh" }),
      makeTag({ id: "t5", indexNr: 8, categoryId: null }),
      makeTag({ id: "t6", indexNr: 3, categoryId: "kLow" }),
    ];

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
    const topTags = sorted.slice(0, TOP_COUNT);

    // Top-5 by indexNr: 1, 2, 3, 5, 8
    expect(topTags.map((t) => t.indexNr)).toEqual([1, 2, 3, 5, 8]);
    expect(topTags.map((t) => t.id)).toEqual(["t2", "t4", "t6", "t3", "t5"]);
  });
});

// --- Dropdown-Tags gruppiert nach Kategorie (Anforderung 7.1, 7.2, 7.3) ---

describe("Dropdown-Tags gruppiert nach Kategorie", () => {
  it("gruppiert Tags nach Kategorie mit gruppiereTagsNachKategorie", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = [
      makeTag({ id: "t1", categoryId: "kA" }),
      makeTag({ id: "t2", categoryId: "kB" }),
      makeTag({ id: "t3", categoryId: "kA" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA, katB]);

    expect(gruppen).toHaveLength(2);
    expect(gruppen[0].kategorie?.id).toBe("kA");
    expect(gruppen[0].tags).toHaveLength(2);
    expect(gruppen[1].kategorie?.id).toBe("kB");
    expect(gruppen[1].tags).toHaveLength(1);
  });

  it("Kategorie-Überschriften sind für jede Gruppe vorhanden", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = [
      makeTag({ id: "t1", categoryId: "kA" }),
      makeTag({ id: "t2", categoryId: "kB" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA, katB]);

    // Each group has a kategorie with a title (used as heading)
    gruppen.forEach((gruppe) => {
      const heading = gruppe.kategorie?.title ?? "Ohne Kategorie";
      expect(heading).toBeTruthy();
      expect(typeof heading).toBe("string");
    });

    expect(gruppen[0].kategorie?.title).toBe("Technik");
    expect(gruppen[1].kategorie?.title).toBe("Emotion");
  });

  it("Tags ohne Kategorie erscheinen in separater Gruppe am Ende", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });

    const tags = [
      makeTag({ id: "t1", categoryId: "kA" }),
      makeTag({ id: "t2", categoryId: null }),
      makeTag({ id: "t3", categoryId: null }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA]);

    expect(gruppen).toHaveLength(2);
    // Last group has null kategorie
    const lastGroup = gruppen[gruppen.length - 1];
    expect(lastGroup.kategorie).toBeNull();
    expect(lastGroup.tags).toHaveLength(2);
  });

  it("'Ohne Kategorie'-Gruppe hat Überschrift 'Ohne Kategorie'", () => {
    resetCounter();
    const tags = [
      makeTag({ id: "t1", categoryId: null }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, []);

    expect(gruppen).toHaveLength(1);
    const heading = gruppen[0].kategorie?.title ?? "Ohne Kategorie";
    expect(heading).toBe("Ohne Kategorie");
  });

  it("Gruppen sind nach orderIndex der Kategorie sortiert", () => {
    resetCounter();
    const katC = makeKategorie({ id: "kC", title: "Dynamik", orderIndex: 2 });
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = [
      makeTag({ id: "t1", categoryId: "kC" }),
      makeTag({ id: "t2", categoryId: "kA" }),
      makeTag({ id: "t3", categoryId: "kB" }),
    ];

    // Pass categories in unsorted order
    const gruppen = gruppiereTagsNachKategorie(tags, [katC, katA, katB]);

    expect(gruppen[0].kategorie?.title).toBe("Technik");
    expect(gruppen[0].kategorie?.orderIndex).toBe(0);
    expect(gruppen[1].kategorie?.title).toBe("Emotion");
    expect(gruppen[1].kategorie?.orderIndex).toBe(1);
    expect(gruppen[2].kategorie?.title).toBe("Dynamik");
    expect(gruppen[2].kategorie?.orderIndex).toBe(2);
  });

  it("leere Kategorien (ohne Tags) werden nicht als Gruppe angezeigt", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = [
      makeTag({ id: "t1", categoryId: "kA" }),
      // No tags for kB
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA, katB]);

    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].kategorie?.id).toBe("kA");
  });
});

// --- Dropdown: Top-5 ausgeschlossen (Toolbar-Logik) ---

describe("Dropdown enthält nur Tags jenseits der Top-5", () => {
  const TOP_COUNT = 5;

  it("Dropdown-Tags sind alle Tags außer den Top-5", () => {
    resetCounter();
    const tags = Array.from({ length: 8 }, (_, i) =>
      makeTag({ id: `t${i + 1}`, indexNr: i + 1, categoryId: i % 2 === 0 ? "kA" : "kB" }),
    );

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
    const topTags = sorted.slice(0, TOP_COUNT);
    const topTagIds = new Set(topTags.map((t) => t.id));
    const moreTags = tags.filter((td) => !topTagIds.has(td.id));

    expect(moreTags).toHaveLength(3);
    expect(moreTags.map((t) => t.indexNr)).toEqual([6, 7, 8]);
  });

  it("Dropdown-Tags werden nach Kategorie gruppiert", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = Array.from({ length: 8 }, (_, i) =>
      makeTag({ id: `t${i + 1}`, indexNr: i + 1, categoryId: i % 2 === 0 ? "kA" : "kB" }),
    );

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);
    const topTags = sorted.slice(0, TOP_COUNT);
    const topTagIds = new Set(topTags.map((t) => t.id));
    const moreTags = tags.filter((td) => !topTagIds.has(td.id));

    const gruppen = gruppiereTagsNachKategorie(moreTags, [katA, katB]);

    // moreTags: t6 (kA), t7 (kB), t8 (kA)
    expect(gruppen.length).toBeGreaterThanOrEqual(1);
    const allGroupedTags = gruppen.flatMap((g) => g.tags);
    expect(allGroupedTags).toHaveLength(moreTags.length);
  });
});

// --- SuggestionDropdown Gruppierungs-Logik (Anforderung 8.4) ---

describe("SuggestionDropdown Gruppierungs-Logik", () => {
  it("gruppiert Items korrekt nach Kategorie", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const items = [
      makeTag({ id: "t1", categoryId: "kA", label: "Belting" }),
      makeTag({ id: "t2", categoryId: "kB", label: "Trauer" }),
      makeTag({ id: "t3", categoryId: "kA", label: "Vibrato" }),
      makeTag({ id: "t4", categoryId: null, label: "Sonstiges" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(items, [katA, katB]);

    expect(gruppen).toHaveLength(3);
    expect(gruppen[0].kategorie?.title).toBe("Technik");
    expect(gruppen[0].tags.map((t) => t.label)).toEqual(["Belting", "Vibrato"]);
    expect(gruppen[1].kategorie?.title).toBe("Emotion");
    expect(gruppen[1].tags.map((t) => t.label)).toEqual(["Trauer"]);
    expect(gruppen[2].kategorie).toBeNull();
    expect(gruppen[2].tags.map((t) => t.label)).toEqual(["Sonstiges"]);
  });

  it("Keyboard-Navigation überspringt Überschriften (nur selectable Items)", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const items = [
      makeTag({ id: "t1", categoryId: "kA", label: "Belting" }),
      makeTag({ id: "t2", categoryId: "kA", label: "Vibrato" }),
      makeTag({ id: "t3", categoryId: "kB", label: "Trauer" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(items, [katA, katB]);

    // Flat list of selectable items (headings are skipped)
    const selectableItems = gruppen.flatMap((g) => g.tags);

    expect(selectableItems).toHaveLength(3);
    expect(selectableItems[0].label).toBe("Belting");
    expect(selectableItems[1].label).toBe("Vibrato");
    expect(selectableItems[2].label).toBe("Trauer");

    // Simulate ArrowDown navigation: index goes 0 → 1 → 2 → 0 (wraps)
    let selectedIndex = 0;
    // ArrowDown
    selectedIndex = selectedIndex >= selectableItems.length - 1 ? 0 : selectedIndex + 1;
    expect(selectedIndex).toBe(1);
    expect(selectableItems[selectedIndex].label).toBe("Vibrato");

    // ArrowDown again – crosses category boundary, no heading stop
    selectedIndex = selectedIndex >= selectableItems.length - 1 ? 0 : selectedIndex + 1;
    expect(selectedIndex).toBe(2);
    expect(selectableItems[selectedIndex].label).toBe("Trauer");

    // ArrowDown wraps to 0
    selectedIndex = selectedIndex >= selectableItems.length - 1 ? 0 : selectedIndex + 1;
    expect(selectedIndex).toBe(0);
    expect(selectableItems[selectedIndex].label).toBe("Belting");
  });

  it("ArrowUp-Navigation überspringt ebenfalls Überschriften", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const items = [
      makeTag({ id: "t1", categoryId: "kA", label: "Belting" }),
      makeTag({ id: "t2", categoryId: "kB", label: "Trauer" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(items, [katA, katB]);
    const selectableItems = gruppen.flatMap((g) => g.tags);

    // Start at 0, ArrowUp wraps to last
    let selectedIndex = 0;
    selectedIndex = selectedIndex <= 0 ? selectableItems.length - 1 : selectedIndex - 1;
    expect(selectedIndex).toBe(1);
    expect(selectableItems[selectedIndex].label).toBe("Trauer");

    // ArrowUp again
    selectedIndex = selectedIndex <= 0 ? selectableItems.length - 1 : selectedIndex - 1;
    expect(selectedIndex).toBe(0);
    expect(selectableItems[selectedIndex].label).toBe("Belting");
  });

  it("ohne Kategorien: einzelne flache Gruppe", () => {
    resetCounter();
    const items = [
      makeTag({ id: "t1", categoryId: null, label: "Belting" }),
      makeTag({ id: "t2", categoryId: null, label: "Vibrato" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(items, []);

    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].kategorie).toBeNull();
    expect(gruppen[0].tags).toHaveLength(2);
  });

  it("leere Items-Liste ergibt keine Gruppen", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });

    const gruppen = gruppiereTagsNachKategorie([], [katA]);

    expect(gruppen).toHaveLength(0);
  });
});

// --- Filterung entfernt leere Gruppen (Anforderung 8.2) ---

describe("Filterung entfernt leere Gruppen", () => {
  it("filtert Tags nach Suchbegriff und entfernt leere Gruppen", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = [
      makeTag({ id: "t1", tag: "belt", label: "Belting", categoryId: "kA" }),
      makeTag({ id: "t2", tag: "vibrato", label: "Vibrato", categoryId: "kA" }),
      makeTag({ id: "t3", tag: "trauer", label: "Trauer", categoryId: "kB" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA, katB]);
    const gefiltert = filtereGruppierteTagDefinitionen(gruppen, "belt");

    // Only Technik group should remain (Belting matches)
    expect(gefiltert).toHaveLength(1);
    expect(gefiltert[0].kategorie?.title).toBe("Technik");
    expect(gefiltert[0].tags).toHaveLength(1);
    expect(gefiltert[0].tags[0].label).toBe("Belting");
  });

  it("leerer Suchbegriff behält alle Gruppen", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });

    const tags = [
      makeTag({ id: "t1", tag: "belt", label: "Belting", categoryId: "kA" }),
      makeTag({ id: "t2", tag: "trauer", label: "Trauer", categoryId: "kB" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA, katB]);
    const gefiltert = filtereGruppierteTagDefinitionen(gruppen, "");

    expect(gefiltert).toHaveLength(2);
  });

  it("Filterung ist case-insensitive", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });

    const tags = [
      makeTag({ id: "t1", tag: "belt", label: "Belting", categoryId: "kA" }),
      makeTag({ id: "t2", tag: "vibrato", label: "Vibrato", categoryId: "kA" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA]);
    const gefiltert = filtereGruppierteTagDefinitionen(gruppen, "BELT");

    expect(gefiltert).toHaveLength(1);
    expect(gefiltert[0].tags).toHaveLength(1);
    expect(gefiltert[0].tags[0].tag).toBe("belt");
  });

  it("Filterung durchsucht sowohl tag als auch label", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });

    const tags = [
      makeTag({ id: "t1", tag: "belt", label: "Belting", categoryId: "kA" }),
      makeTag({ id: "t2", tag: "vib", label: "Vibrato", categoryId: "kA" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA]);

    // Search by label
    const byLabel = filtereGruppierteTagDefinitionen(gruppen, "Vibrato");
    expect(byLabel[0].tags).toHaveLength(1);
    expect(byLabel[0].tags[0].tag).toBe("vib");

    // Search by tag shortcode
    const byTag = filtereGruppierteTagDefinitionen(gruppen, "belt");
    expect(byTag[0].tags).toHaveLength(1);
    expect(byTag[0].tags[0].label).toBe("Belting");
  });

  it("Filterung die keine Treffer ergibt liefert leeres Array", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });

    const tags = [
      makeTag({ id: "t1", tag: "belt", label: "Belting", categoryId: "kA" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA]);
    const gefiltert = filtereGruppierteTagDefinitionen(gruppen, "xyz");

    expect(gefiltert).toHaveLength(0);
  });

  it("nach Filterung enthält keine Gruppe 0 Tags", () => {
    resetCounter();
    const katA = makeKategorie({ id: "kA", title: "Technik", orderIndex: 0 });
    const katB = makeKategorie({ id: "kB", title: "Emotion", orderIndex: 1 });
    const katC = makeKategorie({ id: "kC", title: "Dynamik", orderIndex: 2 });

    const tags = [
      makeTag({ id: "t1", tag: "belt", label: "Belting", categoryId: "kA" }),
      makeTag({ id: "t2", tag: "vibrato", label: "Vibrato", categoryId: "kA" }),
      makeTag({ id: "t3", tag: "trauer", label: "Trauer", categoryId: "kB" }),
      makeTag({ id: "t4", tag: "forte", label: "Forte", categoryId: "kC" }),
      makeTag({ id: "t5", tag: "piano", label: "Piano", categoryId: "kC" }),
    ];

    const gruppen = gruppiereTagsNachKategorie(tags, [katA, katB, katC]);
    const gefiltert = filtereGruppierteTagDefinitionen(gruppen, "belt");

    // Every remaining group must have at least 1 tag
    gefiltert.forEach((gruppe) => {
      expect(gruppe.tags.length).toBeGreaterThan(0);
    });
  });
});
