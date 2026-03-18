/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ChordProNode } from "@/types/vocal-tag";
import { exportChordPro, downloadAsChopro } from "@/lib/vocal-tag/chordpro-export";

describe("ChordPro Export", () => {
  let clickMock: ReturnType<typeof vi.fn>;
  let createdLink: HTMLAnchorElement;

  beforeEach(() => {
    clickMock = vi.fn();

    // Mock URL.createObjectURL / revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Capture the created <a> element
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickMock;
        createdLink = el as HTMLAnchorElement;
      }
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("exportChordPro", () => {
    it("serialisiert Nodes und löst Download aus", () => {
      const nodes: ChordProNode[] = [
        { type: "text", content: "Sing " },
        { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
      ];

      exportChordPro(nodes, "mein-song");

      expect(globalThis.URL.createObjectURL).toHaveBeenCalledOnce();
      const blob = (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("text/plain;charset=utf-8");
      expect(clickMock).toHaveBeenCalledOnce();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("verwendet Standard-Dateinamen 'songtext' wenn keiner angegeben", () => {
      const nodes: ChordProNode[] = [{ type: "text", content: "Text" }];

      exportChordPro(nodes);

      expect(createdLink.download).toBe("songtext.chopro");
    });

    it("exportiert leeres Node-Array als leere Datei", () => {
      exportChordPro([], "leer");

      expect(globalThis.URL.createObjectURL).toHaveBeenCalledOnce();
      expect(clickMock).toHaveBeenCalledOnce();
    });

    it("exportiert Tags mit leerem Zusatztext als {tag:}", async () => {
      const nodes: ChordProNode[] = [
        { type: "chordpro-tag", tag: "belt", zusatztext: "" },
      ];

      exportChordPro(nodes, "test");

      const blob = (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toBe("{belt:}");
    });

    it("exportiert Tags mit Zusatztext als {tag: zusatztext}", async () => {
      const nodes: ChordProNode[] = [
        { type: "chordpro-tag", tag: "falsett", zusatztext: "leise singen" },
      ];

      exportChordPro(nodes, "test");

      const blob = (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toBe("{falsett: leise singen}");
    });

    it("exportiert gemischte Nodes korrekt", async () => {
      const nodes: ChordProNode[] = [
        { type: "text", content: "Zeile 1 " },
        { type: "chordpro-tag", tag: "belt", zusatztext: "kräftig" },
        { type: "text", content: "\nZeile 2 " },
        { type: "chordpro-tag", tag: "hauch", zusatztext: "" },
      ];

      exportChordPro(nodes, "mixed");

      const blob = (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toBe("Zeile 1 {belt: kräftig}\nZeile 2 {hauch:}");
    });
  });

  describe("downloadAsChopro", () => {
    it("erstellt Blob mit korrektem MIME-Typ", () => {
      downloadAsChopro("test content", "datei");

      const blob = (globalThis.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      expect(blob.type).toBe("text/plain;charset=utf-8");
    });

    it("setzt .chopro-Dateiendung", () => {
      downloadAsChopro("content", "mein-export");

      expect(createdLink.download).toBe("mein-export.chopro");
    });

    it("klickt den Link und räumt auf", () => {
      downloadAsChopro("content", "test");

      expect(clickMock).toHaveBeenCalledOnce();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("verwendet Standard-Dateinamen wenn keiner angegeben", () => {
      downloadAsChopro("content");

      expect(createdLink.download).toBe("songtext.chopro");
    });
  });
});
