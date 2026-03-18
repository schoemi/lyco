import { describe, it, expect } from "vitest";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { serializeChordPro } from "@/lib/vocal-tag/chordpro-serializer";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

/**
 * Tests für die globale Kaskadierung von Tag-Definitionen.
 *
 * Stellt sicher, dass:
 * - Tag-Definitionen zur Renderzeit aufgelöst werden (nicht im Songtext gespeichert)
 * - Änderungen an Farbe/Icon sich sofort auf alle Ansichten auswirken
 * - Der Songtext nur Tag-Kürzel und Zusatztext speichert
 *
 * Validiert: Anforderungen 16.1, 16.2, 16.3, 16.4
 */

// --- Hilfsfunktionen ---

const UNKNOWN_ICON = "fa-solid fa-circle-question";
const UNKNOWN_COLOR = "#9ca3af";

function makeTagDef(overrides: Partial<TagDefinitionData> & { tag: string }): TagDefinitionData {
  return {
    id: `id-${overrides.tag}`,
    label: overrides.label ?? overrides.tag,
    icon: overrides.icon ?? "fa-solid fa-microphone",
    color: overrides.color ?? "#ff0000",
    indexNr: overrides.indexNr ?? 1,
    ...overrides,
  };
}

/**
 * Simuliert die Kompakt-Ansicht: gibt für jeden Tag nur Icon und Farbe zurück.
 */
function renderCompact(
  text: string,
  tagDefinitions: TagDefinitionData[],
): Array<{ type: "text"; content: string } | { type: "icon"; icon: string; color: string }> {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);
  return nodes.map((node) => {
    if (node.type === "text") {
      return { type: "text" as const, content: node.content ?? "" };
    }
    const def = tagDefinitions.find((d) => d.tag === node.tag);
    return {
      type: "icon" as const,
      icon: def?.icon ?? UNKNOWN_ICON,
      color: def?.color ?? UNKNOWN_COLOR,
    };
  });
}

/**
 * Simuliert die Detail-Ansicht: gibt für jeden Tag Icon, Farbe und Zusatztext zurück.
 */
function renderDetail(
  text: string,
  tagDefinitions: TagDefinitionData[],
): Array<{ type: "text"; content: string } | { type: "annotation"; icon: string; color: string; zusatztext: string }> {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);
  return nodes.map((node) => {
    if (node.type === "text") {
      return { type: "text" as const, content: node.content ?? "" };
    }
    const def = tagDefinitions.find((d) => d.tag === node.tag);
    return {
      type: "annotation" as const,
      icon: def?.icon ?? UNKNOWN_ICON,
      color: def?.color ?? UNKNOWN_COLOR,
      zusatztext: node.zusatztext ?? "",
    };
  });
}

/**
 * Simuliert die InlineBadge-Auflösung im Editor.
 */
function resolveInlineBadge(
  tag: string,
  tagDefinitions: TagDefinitionData[],
): { icon: string; color: string; label: string } {
  const def = tagDefinitions.find((d) => d.tag === tag);
  return {
    icon: def?.icon ?? UNKNOWN_ICON,
    color: def?.color ?? UNKNOWN_COLOR,
    label: def?.label ?? tag,
  };
}

// --- Tests ---

describe("Globale Kaskadierung von Tag-Definitionen", () => {
  describe("Songtext speichert nur Kürzel und Zusatztext (Anf. 16.4)", () => {
    it("Serialisierter Text enthält keine Farb- oder Icon-Informationen", () => {
      const nodes: ChordProNode[] = [
        { type: "text", content: "Sing " },
        { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
        { type: "text", content: " hier" },
      ];

      const serialized = serializeChordPro(nodes);

      expect(serialized).toBe("Sing {belt: kräftig} hier");
      expect(serialized).not.toContain("#");
      expect(serialized).not.toContain("fa-");
      expect(serialized).not.toContain("color");
      expect(serialized).not.toContain("icon");
    });

    it("Parser extrahiert nur Tag-Kürzel und Zusatztext, keine Darstellungsdaten", () => {
      const text = "Hallo {belt: kräftig} Welt";
      const { nodes } = parseChordPro(text, ["belt"]);

      const tagNode = nodes.find((n) => n.type === "chordpro-tag");
      expect(tagNode).toBeDefined();
      expect(tagNode!.tag).toBe("belt");
      expect(tagNode!.zusatztext).toBe("kräftig");
      // Keine Farb-/Icon-Felder im geparsten Node
      expect(tagNode).not.toHaveProperty("color");
      expect(tagNode).not.toHaveProperty("icon");
    });
  });

  describe("Farbänderung kaskadiert in Kompakt-Ansicht (Anf. 16.1)", () => {
    it("Gleicher Songtext zeigt unterschiedliche Farben bei geänderter Tag-Definition", () => {
      const songText = "Sing {belt: kräftig} hier";

      const defsV1 = [makeTagDef({ tag: "belt", color: "#ff0000", icon: "fa-solid fa-fire" })];
      const defsV2 = [makeTagDef({ tag: "belt", color: "#00ff00", icon: "fa-solid fa-fire" })];

      const renderV1 = renderCompact(songText, defsV1);
      const renderV2 = renderCompact(songText, defsV2);

      const iconV1 = renderV1.find((n) => n.type === "icon") as { color: string };
      const iconV2 = renderV2.find((n) => n.type === "icon") as { color: string };

      expect(iconV1.color).toBe("#ff0000");
      expect(iconV2.color).toBe("#00ff00");
      expect(iconV1.color).not.toBe(iconV2.color);
    });
  });

  describe("Icon-Änderung kaskadiert in Kompakt-Ansicht (Anf. 16.1)", () => {
    it("Gleicher Songtext zeigt unterschiedliche Icons bei geänderter Tag-Definition", () => {
      const songText = "Sing {belt: kräftig} hier";

      const defsV1 = [makeTagDef({ tag: "belt", icon: "fa-solid fa-fire" })];
      const defsV2 = [makeTagDef({ tag: "belt", icon: "fa-solid fa-star" })];

      const renderV1 = renderCompact(songText, defsV1);
      const renderV2 = renderCompact(songText, defsV2);

      const iconV1 = renderV1.find((n) => n.type === "icon") as { icon: string };
      const iconV2 = renderV2.find((n) => n.type === "icon") as { icon: string };

      expect(iconV1.icon).toBe("fa-solid fa-fire");
      expect(iconV2.icon).toBe("fa-solid fa-star");
    });
  });

  describe("Farbänderung kaskadiert in Detail-Ansicht (Anf. 16.2)", () => {
    it("Gleicher Songtext zeigt aktualisierte Farbe in der Detail-Ansicht", () => {
      const songText = "Sing {belt: kräftig} hier";

      const defsV1 = [makeTagDef({ tag: "belt", color: "#0000ff", icon: "fa-solid fa-music" })];
      const defsV2 = [makeTagDef({ tag: "belt", color: "#ff00ff", icon: "fa-solid fa-music" })];

      const renderV1 = renderDetail(songText, defsV1);
      const renderV2 = renderDetail(songText, defsV2);

      const annoV1 = renderV1.find((n) => n.type === "annotation") as { color: string };
      const annoV2 = renderV2.find((n) => n.type === "annotation") as { color: string };

      expect(annoV1.color).toBe("#0000ff");
      expect(annoV2.color).toBe("#ff00ff");
    });
  });

  describe("Icon-Änderung kaskadiert in Detail-Ansicht (Anf. 16.2)", () => {
    it("Gleicher Songtext zeigt aktualisiertes Icon in der Detail-Ansicht", () => {
      const songText = "Sing {belt: kräftig} hier";

      const defsV1 = [makeTagDef({ tag: "belt", icon: "fa-solid fa-bolt" })];
      const defsV2 = [makeTagDef({ tag: "belt", icon: "fa-solid fa-heart" })];

      const renderV1 = renderDetail(songText, defsV1);
      const renderV2 = renderDetail(songText, defsV2);

      const annoV1 = renderV1.find((n) => n.type === "annotation") as { icon: string };
      const annoV2 = renderV2.find((n) => n.type === "annotation") as { icon: string };

      expect(annoV1.icon).toBe("fa-solid fa-bolt");
      expect(annoV2.icon).toBe("fa-solid fa-heart");
    });
  });

  describe("Kaskadierung im Editor / InlineBadge (Anf. 16.3)", () => {
    it("InlineBadge zeigt aktualisierte Farbe und Icon bei geänderter Definition", () => {
      const defsV1 = [makeTagDef({ tag: "belt", color: "#aabbcc", icon: "fa-solid fa-volume-high" })];
      const defsV2 = [makeTagDef({ tag: "belt", color: "#112233", icon: "fa-solid fa-guitar" })];

      const badgeV1 = resolveInlineBadge("belt", defsV1);
      const badgeV2 = resolveInlineBadge("belt", defsV2);

      expect(badgeV1.color).toBe("#aabbcc");
      expect(badgeV1.icon).toBe("fa-solid fa-volume-high");

      expect(badgeV2.color).toBe("#112233");
      expect(badgeV2.icon).toBe("fa-solid fa-guitar");
    });

    it("InlineBadge zeigt aktualisiertes Label bei geänderter Definition", () => {
      const defsV1 = [makeTagDef({ tag: "belt", label: "Belting" })];
      const defsV2 = [makeTagDef({ tag: "belt", label: "Kraftgesang" })];

      const badgeV1 = resolveInlineBadge("belt", defsV1);
      const badgeV2 = resolveInlineBadge("belt", defsV2);

      expect(badgeV1.label).toBe("Belting");
      expect(badgeV2.label).toBe("Kraftgesang");
    });
  });

  describe("Mehrere Tags kaskadieren unabhängig", () => {
    it("Änderung an einem Tag beeinflusst andere Tags nicht", () => {
      const songText = "Sing {belt: kräftig} und {whisper: leise} hier";

      const defsV1 = [
        makeTagDef({ tag: "belt", color: "#ff0000", icon: "fa-solid fa-fire", indexNr: 1 }),
        makeTagDef({ tag: "whisper", color: "#0000ff", icon: "fa-solid fa-wind", indexNr: 2 }),
      ];
      // Nur belt-Farbe geändert
      const defsV2 = [
        makeTagDef({ tag: "belt", color: "#00ff00", icon: "fa-solid fa-fire", indexNr: 1 }),
        makeTagDef({ tag: "whisper", color: "#0000ff", icon: "fa-solid fa-wind", indexNr: 2 }),
      ];

      const renderV1 = renderCompact(songText, defsV1);
      const renderV2 = renderCompact(songText, defsV2);

      const iconsV1 = renderV1.filter((n) => n.type === "icon") as Array<{ icon: string; color: string }>;
      const iconsV2 = renderV2.filter((n) => n.type === "icon") as Array<{ icon: string; color: string }>;

      // belt hat sich geändert
      expect(iconsV1[0].color).toBe("#ff0000");
      expect(iconsV2[0].color).toBe("#00ff00");

      // whisper bleibt gleich
      expect(iconsV1[1].color).toBe("#0000ff");
      expect(iconsV2[1].color).toBe("#0000ff");
    });
  });

  describe("Konsistenz über alle Ansichten hinweg", () => {
    it("Kompakt- und Detail-Ansicht zeigen dieselbe Farbe und dasselbe Icon", () => {
      const songText = "Sing {belt: kräftig} hier";
      const defs = [makeTagDef({ tag: "belt", color: "#abcdef", icon: "fa-solid fa-music" })];

      const compact = renderCompact(songText, defs);
      const detail = renderDetail(songText, defs);

      const compactIcon = compact.find((n) => n.type === "icon") as { icon: string; color: string };
      const detailAnno = detail.find((n) => n.type === "annotation") as { icon: string; color: string };

      expect(compactIcon.icon).toBe(detailAnno.icon);
      expect(compactIcon.color).toBe(detailAnno.color);
    });

    it("Editor-Badge und Ansichten zeigen dieselbe Farbe und dasselbe Icon", () => {
      const defs = [makeTagDef({ tag: "belt", color: "#abcdef", icon: "fa-solid fa-music" })];

      const badge = resolveInlineBadge("belt", defs);
      const compact = renderCompact("Sing {belt: kräftig} hier", defs);
      const compactIcon = compact.find((n) => n.type === "icon") as { icon: string; color: string };

      expect(badge.icon).toBe(compactIcon.icon);
      expect(badge.color).toBe(compactIcon.color);
    });
  });
});
