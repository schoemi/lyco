import { describe, it, expect } from "vitest";
import type { TagDefinitionData } from "@/types/vocal-tag";
import {
  serializeTagConfig,
  validateTagConfigJson,
  checkDuplicates,
  type TagConfigImportItem,
} from "@/lib/vocal-tag/tag-config-export";

const sampleTags: TagDefinitionData[] = [
  { id: "1", tag: "belt", label: "Belting", icon: "fa-solid fa-fire", color: "#ff0000", indexNr: 1 },
  { id: "2", tag: "falsett", label: "Falsett", icon: "fa-solid fa-feather", color: "#0000ff", indexNr: 2 },
];

describe("serializeTagConfig", () => {
  it("serialisiert Tag-Definitionen ohne id-Feld", () => {
    const json = serializeTagConfig(sampleTags);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      tag: "belt",
      label: "Belting",
      icon: "fa-solid fa-fire",
      color: "#ff0000",
      indexNr: 1,
    });
    expect(parsed[0]).not.toHaveProperty("id");
  });

  it("serialisiert leeres Array", () => {
    const json = serializeTagConfig([]);
    expect(JSON.parse(json)).toEqual([]);
  });

  it("erzeugt gültiges JSON", () => {
    const json = serializeTagConfig(sampleTags);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("validateTagConfigJson", () => {
  it("akzeptiert gültiges JSON-Array mit allen Pflichtfeldern", () => {
    const input = JSON.stringify([
      { tag: "belt", label: "Belting", icon: "fa-solid fa-fire", color: "#ff0000", indexNr: 1 },
    ]);
    const result = validateTagConfigJson(input);

    expect(result.valid).toBe(true);
    expect(result.definitions).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("lehnt ungültiges JSON ab", () => {
    const result = validateTagConfigJson("not json {{{");

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Ungültiges JSON-Format");
  });

  it("lehnt Nicht-Array-JSON ab", () => {
    const result = validateTagConfigJson('{"tag": "belt"}');

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("JSON-Array");
  });

  it("lehnt leeres Array ab", () => {
    const result = validateTagConfigJson("[]");

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("leer");
  });

  it("meldet fehlende Pflichtfelder", () => {
    const input = JSON.stringify([{ tag: "belt" }]);
    const result = validateTagConfigJson(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("label"))).toBe(true);
    expect(result.errors.some((e) => e.includes("icon"))).toBe(true);
    expect(result.errors.some((e) => e.includes("color"))).toBe(true);
    expect(result.errors.some((e) => e.includes("indexNr"))).toBe(true);
  });

  it("meldet falsche Feldtypen", () => {
    const input = JSON.stringify([
      { tag: 123, label: "Belting", icon: "fa", color: "#fff", indexNr: "eins" },
    ]);
    const result = validateTagConfigJson(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("'tag' muss ein String"))).toBe(true);
    expect(result.errors.some((e) => e.includes("'indexNr' muss eine Zahl"))).toBe(true);
  });

  it("meldet Nicht-Objekt-Einträge", () => {
    const input = JSON.stringify(["string-entry"]);
    const result = validateTagConfigJson(input);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Objekt");
  });

  it("ignoriert zusätzliche Felder und extrahiert nur Pflichtfelder", () => {
    const input = JSON.stringify([
      { tag: "belt", label: "Belting", icon: "fa", color: "#fff", indexNr: 1, extra: "ignored" },
    ]);
    const result = validateTagConfigJson(input);

    expect(result.valid).toBe(true);
    expect(result.definitions[0]).not.toHaveProperty("extra");
  });

  it("validiert mehrere Einträge und meldet Fehler mit Position", () => {
    const input = JSON.stringify([
      { tag: "belt", label: "Belting", icon: "fa", color: "#fff", indexNr: 1 },
      { tag: "bad" },
    ]);
    const result = validateTagConfigJson(input);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.startsWith("Eintrag 2:"))).toBe(true);
  });
});

describe("checkDuplicates", () => {
  const importItems: TagConfigImportItem[] = [
    { tag: "belt", label: "Belting Neu", icon: "fa-new", color: "#111", indexNr: 1 },
    { tag: "hauch", label: "Hauchstimme", icon: "fa-wind", color: "#222", indexNr: 3 },
  ];

  it("erkennt Duplikate korrekt", () => {
    const result = checkDuplicates(importItems, sampleTags);

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].tag).toBe("belt");
    expect(result.newItems).toHaveLength(1);
    expect(result.newItems[0].tag).toBe("hauch");
  });

  it("gibt alle als neu zurück wenn keine Duplikate", () => {
    const newItems: TagConfigImportItem[] = [
      { tag: "hauch", label: "Hauchstimme", icon: "fa-wind", color: "#222", indexNr: 3 },
    ];
    const result = checkDuplicates(newItems, sampleTags);

    expect(result.duplicates).toHaveLength(0);
    expect(result.newItems).toHaveLength(1);
  });

  it("gibt alle als Duplikate zurück wenn alle existieren", () => {
    const dupes: TagConfigImportItem[] = [
      { tag: "belt", label: "Belt", icon: "fa", color: "#f00", indexNr: 1 },
      { tag: "falsett", label: "Falsett", icon: "fa", color: "#00f", indexNr: 2 },
    ];
    const result = checkDuplicates(dupes, sampleTags);

    expect(result.duplicates).toHaveLength(2);
    expect(result.newItems).toHaveLength(0);
  });

  it("funktioniert mit leeren bestehenden Tags", () => {
    const result = checkDuplicates(importItems, []);

    expect(result.duplicates).toHaveLength(0);
    expect(result.newItems).toHaveLength(2);
  });
});

describe("Round-Trip: serialize → validate", () => {
  it("serialisierte Tags können erfolgreich re-importiert werden", () => {
    const json = serializeTagConfig(sampleTags);
    const result = validateTagConfigJson(json);

    expect(result.valid).toBe(true);
    expect(result.definitions).toHaveLength(2);
    expect(result.definitions[0].tag).toBe("belt");
    expect(result.definitions[1].tag).toBe("falsett");
  });
});
