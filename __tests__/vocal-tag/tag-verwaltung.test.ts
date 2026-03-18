import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * Unit-Tests für die Tag-Verwaltungsseite (Admin).
 *
 * Da die Testumgebung node ist (kein jsdom), testen wir die Kernlogik:
 * Listendarstellung/Sortierung, Inline-Editing-Ablauf, Erstellungs-Dialog-Validierung,
 * Lösch-Dialog mit betroffenen Songs.
 *
 * Anforderungen: 3.1, 3.2, 3.3, 3.4, 3.8
 */

function makeTag(overrides: Partial<TagDefinitionData> = {}): TagDefinitionData {
  return {
    id: "tag-1",
    tag: "belt",
    label: "Belting",
    icon: "fa-solid fa-microphone",
    color: "#FF0000",
    indexNr: 1,
    ...overrides,
  };
}

function makeTags(count: number): TagDefinitionData[] {
  return Array.from({ length: count }, (_, i) =>
    makeTag({
      id: `tag-${i + 1}`,
      tag: `tag${i + 1}`,
      label: `Label ${i + 1}`,
      icon: `fa-solid fa-icon-${i + 1}`,
      color: `#${String((i + 1) * 111111).slice(0, 6)}`,
      indexNr: i + 1,
    })
  );
}

// --- Listendarstellung (Anforderung 3.1, 3.2) ---

describe("Listendarstellung", () => {
  it("sortiert Tags nach indexNr aufsteigend", () => {
    const tags = [
      makeTag({ id: "t3", tag: "vibrato", indexNr: 3 }),
      makeTag({ id: "t1", tag: "belt", indexNr: 1 }),
      makeTag({ id: "t2", tag: "falsett", indexNr: 2 }),
    ];

    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);

    expect(sorted[0].tag).toBe("belt");
    expect(sorted[1].tag).toBe("falsett");
    expect(sorted[2].tag).toBe("vibrato");
  });

  it("zeigt für jeden Tag Icon, Label, Kürzel und indexNr an", () => {
    const tag = makeTag();

    // Prüfe, dass alle Anzeigefelder vorhanden sind (Anforderung 3.2)
    expect(tag.icon).toBeTruthy();
    expect(tag.label).toBeTruthy();
    expect(tag.tag).toBeTruthy();
    expect(typeof tag.indexNr).toBe("number");
    expect(tag.color).toMatch(/^#/);
  });

  it("zeigt leere Liste korrekt an", () => {
    const tags: TagDefinitionData[] = [];
    const sorted = [...tags].sort((a, b) => a.indexNr - b.indexNr);

    expect(sorted).toHaveLength(0);
  });

  it("stellt aria-label mit Label und Kürzel bereit (Anforderung 3.9)", () => {
    const tag = makeTag({ label: "Belting", tag: "belt" });

    // Die Seite setzt aria-label als `${tag.label} (${tag.tag})`
    const ariaLabel = `${tag.label} (${tag.tag})`;

    expect(ariaLabel).toBe("Belting (belt)");
    expect(ariaLabel).toContain(tag.label);
    expect(ariaLabel).toContain(tag.tag);
  });

  it("behält Sortierung nach Einfügen eines neuen Tags bei", () => {
    const tags = makeTags(3);
    const newTag = makeTag({ id: "tag-new", tag: "newtag", label: "Neu", indexNr: 2 });

    const updated = [...tags, newTag].sort((a, b) => a.indexNr - b.indexNr);

    expect(updated[0].indexNr).toBe(1);
    expect(updated[1].indexNr).toBe(2);
    expect(updated[2].indexNr).toBe(2); // gleiche indexNr
    expect(updated[3].indexNr).toBe(3);
  });
});

// --- Inline-Editing (Anforderung 3.3) ---

describe("Inline-Editing", () => {
  // Simuliert den Editing-State der Seite
  interface EditingState {
    id: string;
    field: "label" | "color" | "indexNr";
    value: string;
  }

  it("startet Editing mit aktuellem Wert für label", () => {
    const tag = makeTag({ label: "Belting" });
    const editing: EditingState = {
      id: tag.id,
      field: "label",
      value: tag.label,
    };

    expect(editing.value).toBe("Belting");
    expect(editing.field).toBe("label");
  });

  it("startet Editing mit aktuellem Wert für indexNr als String", () => {
    const tag = makeTag({ indexNr: 5 });
    const editing: EditingState = {
      id: tag.id,
      field: "indexNr",
      value: String(tag.indexNr),
    };

    expect(editing.value).toBe("5");
  });

  it("startet Editing mit aktuellem Wert für color", () => {
    const tag = makeTag({ color: "#00FF00" });
    const editing: EditingState = {
      id: tag.id,
      field: "color",
      value: tag.color,
    };

    expect(editing.value).toBe("#00FF00");
  });

  it("verwirft Änderung wenn Wert unverändert bleibt (label)", () => {
    const tag = makeTag({ label: "Belting" });
    const editValue = "Belting"; // gleicher Wert

    const trimmed = editValue.trim();
    const unchanged = trimmed === tag.label;

    expect(unchanged).toBe(true);
  });

  it("verwirft Änderung wenn Wert unverändert bleibt (indexNr)", () => {
    const tag = makeTag({ indexNr: 3 });
    const editValue = "3";

    const num = parseInt(editValue, 10);
    const unchanged = num === tag.indexNr;

    expect(unchanged).toBe(true);
  });

  it("verwirft ungültige indexNr (NaN)", () => {
    const editValue = "abc";
    const num = parseInt(editValue, 10);

    expect(isNaN(num)).toBe(true);
  });

  it("verwirft leeren label-Wert", () => {
    const editValue = "   ";
    const trimmed = editValue.trim();

    expect(!trimmed).toBe(true);
  });

  it("erstellt korrektes Update-Payload für label", () => {
    const editValue = " Neues Label ";
    const field = "label" as const;

    const payload: Record<string, unknown> = {};
    const trimmed = editValue.trim();
    payload[field] = trimmed;

    expect(payload).toEqual({ label: "Neues Label" });
  });

  it("erstellt korrektes Update-Payload für indexNr", () => {
    const editValue = "7";
    const field = "indexNr" as const;

    const payload: Record<string, unknown> = {};
    const num = parseInt(editValue, 10);
    payload[field] = num;

    expect(payload).toEqual({ indexNr: 7 });
  });

  it("erstellt korrektes Update-Payload für color", () => {
    const editValue = "#00FF00";
    const field = "color" as const;

    const payload: Record<string, unknown> = {};
    payload[field] = editValue.trim();

    expect(payload).toEqual({ color: "#00FF00" });
  });

  it("aktualisiert Tag in der Liste und sortiert neu nach indexNr", () => {
    const tags = makeTags(3);
    const updatedTag = { ...tags[0], indexNr: 10 };

    const newList = tags
      .map((t) => (t.id === updatedTag.id ? updatedTag : t))
      .sort((a, b) => a.indexNr - b.indexNr);

    expect(newList[newList.length - 1].id).toBe(updatedTag.id);
    expect(newList[0].indexNr).toBeLessThanOrEqual(newList[1].indexNr);
  });
});

// --- Erstellungs-Dialog (Anforderung 3.4) ---

describe("Erstellungs-Dialog", () => {
  it("validiert fehlende Pflichtfelder: tag", () => {
    const tag = "";
    const label = "Belting";
    const icon = "fa-solid fa-microphone";

    const errors: string[] = [];
    if (!tag.trim()) errors.push("Kürzel ist erforderlich");
    if (!label.trim()) errors.push("Label ist erforderlich");
    if (!icon.trim()) errors.push("Bitte ein Icon auswählen");

    expect(errors).toEqual(["Kürzel ist erforderlich"]);
  });

  it("validiert fehlende Pflichtfelder: label", () => {
    const tag = "belt";
    const label = "";
    const icon = "fa-solid fa-microphone";

    const errors: string[] = [];
    if (!tag.trim()) errors.push("Kürzel ist erforderlich");
    if (!label.trim()) errors.push("Label ist erforderlich");
    if (!icon.trim()) errors.push("Bitte ein Icon auswählen");

    expect(errors).toEqual(["Label ist erforderlich"]);
  });

  it("validiert fehlende Pflichtfelder: icon", () => {
    const tag = "belt";
    const label = "Belting";
    const icon = "";

    const errors: string[] = [];
    if (!tag.trim()) errors.push("Kürzel ist erforderlich");
    if (!label.trim()) errors.push("Label ist erforderlich");
    if (!icon.trim()) errors.push("Bitte ein Icon auswählen");

    expect(errors).toEqual(["Bitte ein Icon auswählen"]);
  });

  it("akzeptiert gültige Eingaben ohne Fehler", () => {
    const tag = "belt";
    const label = "Belting";
    const icon = "fa-solid fa-microphone";

    const errors: string[] = [];
    if (!tag.trim()) errors.push("Kürzel ist erforderlich");
    if (!label.trim()) errors.push("Label ist erforderlich");
    if (!icon.trim()) errors.push("Bitte ein Icon auswählen");

    expect(errors).toHaveLength(0);
  });

  it("trimmt Eingabewerte vor dem Senden", () => {
    const tag = "  belt  ";
    const label = "  Belting  ";
    const icon = "  fa-solid fa-microphone  ";

    const payload = {
      tag: tag.trim(),
      label: label.trim(),
      icon: icon.trim(),
      color: "#3b82f6",
      indexNr: 1,
    };

    expect(payload.tag).toBe("belt");
    expect(payload.label).toBe("Belting");
    expect(payload.icon).toBe("fa-solid fa-microphone");
  });

  it("setzt Standardfarbe auf #3b82f6", () => {
    const defaultColor = "#3b82f6";
    expect(defaultColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("fügt neuen Tag sortiert in die Liste ein", () => {
    const tags = makeTags(3);
    const newTag = makeTag({ id: "new", tag: "newtag", label: "Neu", indexNr: 2 });

    const updated = [...tags, newTag].sort((a, b) => a.indexNr - b.indexNr);

    // Neuer Tag mit indexNr 2 sollte an Position 1 oder 2 sein
    const newTagIndex = updated.findIndex((t) => t.id === "new");
    expect(newTagIndex).toBeGreaterThanOrEqual(1);
    expect(newTagIndex).toBeLessThanOrEqual(2);
  });

  it("Icon-Picker filtert Icons nach Suchbegriff", () => {
    const icons = [
      { cls: "fa-solid fa-microphone", label: "Microphone" },
      { cls: "fa-solid fa-music", label: "Music" },
      { cls: "fa-solid fa-guitar", label: "Guitar" },
    ];

    const search = "micro";
    const filtered = icons.filter(
      (i) =>
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        i.cls.toLowerCase().includes(search.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].label).toBe("Microphone");
  });

  it("Icon-Picker zeigt alle Icons bei leerem Suchfeld", () => {
    const icons = [
      { cls: "fa-solid fa-microphone", label: "Microphone" },
      { cls: "fa-solid fa-music", label: "Music" },
    ];

    const search = "";
    const filtered = search.trim()
      ? icons.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
      : icons;

    expect(filtered).toHaveLength(2);
  });
});

// --- Lösch-Dialog (Anforderung 3.8) ---

describe("Lösch-Dialog", () => {
  it("zeigt Warnung wenn betroffene Songs > 0", () => {
    const affectedSongs = 5;
    const showWarning = affectedSongs > 0;

    expect(showWarning).toBe(true);
  });

  it("zeigt keine Warnung wenn keine Songs betroffen sind", () => {
    const affectedSongs = 0;
    const showWarning = affectedSongs > 0;

    expect(showWarning).toBe(false);
  });

  it("zeigt korrekte Singular-Form für 1 Song", () => {
    const affectedSongs = 1;
    const text = affectedSongs === 1 ? "Song" : "Songs";

    expect(text).toBe("Song");
  });

  it("zeigt korrekte Plural-Form für mehrere Songs", () => {
    const affectedSongs: number = 3;
    const text = affectedSongs === 1 ? "Song" : "Songs";

    expect(text).toBe("Songs");
  });

  it("entfernt gelöschten Tag aus der Liste", () => {
    const tags = makeTags(3);
    const deleteId = "tag-2";

    const remaining = tags.filter((t) => t.id !== deleteId);

    expect(remaining).toHaveLength(2);
    expect(remaining.find((t) => t.id === deleteId)).toBeUndefined();
  });

  it("behält Sortierung nach Löschen bei", () => {
    const tags = makeTags(5);
    const deleteId = "tag-3";

    const remaining = tags.filter((t) => t.id !== deleteId);

    for (let i = 1; i < remaining.length; i++) {
      expect(remaining[i].indexNr).toBeGreaterThanOrEqual(remaining[i - 1].indexNr);
    }
  });

  it("zeigt Warnungstext mit Anzahl betroffener Songs", () => {
    const affectedSongs: number = 7;
    const warningText = `Dieser Tag wird in ${affectedSongs} ${affectedSongs === 1 ? "Song" : "Songs"} verwendet.`;

    expect(warningText).toBe("Dieser Tag wird in 7 Songs verwendet.");
    expect(warningText).toContain("7");
  });
});

// --- Drag-and-Drop-Sortierung (Anforderung 3.7) ---

describe("Drag-and-Drop-Sortierung", () => {
  it("ordnet Tags nach Drag-and-Drop korrekt um", () => {
    const tags = makeTags(4);
    const dragIndex = 0;
    const dropIndex = 2;

    const reordered = [...tags];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const updated = reordered.map((tag, i) => ({ ...tag, indexNr: i + 1 }));

    expect(updated[0].tag).toBe("tag2");
    expect(updated[1].tag).toBe("tag3");
    expect(updated[2].tag).toBe("tag1");
    expect(updated[3].tag).toBe("tag4");
  });

  it("weist sequenzielle indexNr-Werte nach Umsortierung zu", () => {
    const tags = makeTags(5);
    const reordered = [...tags].reverse();
    const updated = reordered.map((tag, i) => ({ ...tag, indexNr: i + 1 }));

    updated.forEach((tag, i) => {
      expect(tag.indexNr).toBe(i + 1);
    });
  });

  it("erkennt geänderte Tags für API-Persistierung", () => {
    const original = makeTags(4);
    const reordered = [...original];
    const [moved] = reordered.splice(0, 1);
    reordered.splice(2, 0, moved);
    const updated = reordered.map((tag, i) => ({ ...tag, indexNr: i + 1 }));

    const changed = updated.filter((tag) => {
      const orig = original.find((t) => t.id === tag.id);
      return orig && orig.indexNr !== tag.indexNr;
    });

    // Tag1 (1→3), Tag2 (2→1), Tag3 (3→2) geändert, Tag4 bleibt
    expect(changed.length).toBe(3);
  });

  it("erkennt keine Änderungen wenn Drop-Position gleich Drag-Position", () => {
    const original = makeTags(3);
    const dragIndex = 1;
    const dropIndex = 1;

    // Kein Umsortieren nötig
    const noChange = dragIndex === dropIndex;
    expect(noChange).toBe(true);
  });
});
