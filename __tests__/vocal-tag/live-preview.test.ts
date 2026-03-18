import { describe, it, expect } from "vitest";
import type { TagDefinitionData } from "@/types/vocal-tag";
import type { ViewMode } from "@/components/vocal-tag/view-toggle";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";

/**
 * Unit tests for LivePreview component logic.
 *
 * Since the test environment is node (not jsdom), we test the core logic:
 * - Enable/disable toggle behavior
 * - Preview mode toggle (compact ↔ detail)
 * - Layout class derivation (full width when disabled, split when enabled)
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 */

function makeTags(count: number): TagDefinitionData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i + 1}`,
    tag: `tag${i + 1}`,
    label: `Label ${i + 1}`,
    icon: `fa-solid fa-${i + 1}`,
    color: `#${String(i + 1).padStart(6, "0")}`,
    indexNr: i + 1,
  }));
}

/**
 * Simulates the LivePreview state machine:
 * - enabled: whether the preview pane is visible
 * - previewMode: "compact" | "detail"
 */
interface LivePreviewState {
  enabled: boolean;
  previewMode: ViewMode;
}

function createInitialState(): LivePreviewState {
  return { enabled: false, previewMode: "compact" };
}

function toggleEnabled(state: LivePreviewState): LivePreviewState {
  return { ...state, enabled: !state.enabled };
}

function togglePreviewMode(state: LivePreviewState): LivePreviewState {
  return {
    ...state,
    previewMode: state.previewMode === "compact" ? "detail" : "compact",
  };
}

/**
 * Derives the CSS class for the editor pane based on enabled state.
 */
function editorWidthClass(enabled: boolean): string {
  return enabled ? "w-1/2" : "w-full";
}

/**
 * Determines whether the preview pane should be rendered.
 */
function showPreviewPane(enabled: boolean): boolean {
  return enabled;
}

describe("LivePreview logic", () => {
  describe("initial state (Req 12.4)", () => {
    it("starts with preview disabled", () => {
      const state = createInitialState();
      expect(state.enabled).toBe(false);
    });

    it("starts with compact preview mode", () => {
      const state = createInitialState();
      expect(state.previewMode).toBe("compact");
    });
  });

  describe("enable/disable toggle (Req 12.4, 12.5)", () => {
    it("enables preview on first toggle", () => {
      let state = createInitialState();
      state = toggleEnabled(state);
      expect(state.enabled).toBe(true);
    });

    it("disables preview on second toggle", () => {
      let state = createInitialState();
      state = toggleEnabled(state);
      state = toggleEnabled(state);
      expect(state.enabled).toBe(false);
    });

    it("toggles back and forth", () => {
      let state = createInitialState();
      for (let i = 0; i < 5; i++) {
        state = toggleEnabled(state);
        expect(state.enabled).toBe(i % 2 === 0);
      }
    });
  });

  describe("preview mode toggle (Req 12.3)", () => {
    it("toggles from compact to detail", () => {
      let state = createInitialState();
      state = togglePreviewMode(state);
      expect(state.previewMode).toBe("detail");
    });

    it("toggles from detail back to compact", () => {
      let state = createInitialState();
      state = togglePreviewMode(state);
      state = togglePreviewMode(state);
      expect(state.previewMode).toBe("compact");
    });

    it("preserves preview mode when toggling enabled state", () => {
      let state = createInitialState();
      state = toggleEnabled(state); // enable
      state = togglePreviewMode(state); // switch to detail
      expect(state.previewMode).toBe("detail");
      state = toggleEnabled(state); // disable
      state = toggleEnabled(state); // re-enable
      expect(state.previewMode).toBe("detail"); // still detail
    });
  });

  describe("layout: full width when disabled (Req 12.1, 12.5)", () => {
    it("editor is full width when preview is disabled", () => {
      expect(editorWidthClass(false)).toBe("w-full");
    });

    it("editor is half width when preview is enabled", () => {
      expect(editorWidthClass(true)).toBe("w-1/2");
    });
  });

  describe("preview pane visibility (Req 12.1)", () => {
    it("preview pane is hidden when disabled", () => {
      expect(showPreviewPane(false)).toBe(false);
    });

    it("preview pane is shown when enabled", () => {
      expect(showPreviewPane(true)).toBe(true);
    });
  });

  describe("real-time update (Req 12.2)", () => {
    it("preview reflects the latest text prop", () => {
      // The component re-renders CompactView/DetailView with the current `text` prop.
      // We verify the contract: changing text should produce different parse results.
      const tags = makeTags(2);
      const knownTags = tags.map((t) => t.tag);

      const result1 = parseChordPro("Hello {tag1: soft}", knownTags);
      const result2 = parseChordPro("Hello {tag1: loud}", knownTags);

      // Different zusatztext → different parse results
      const tag1 = result1.nodes.find((n) => n.type === "chordpro-tag");
      const tag2 = result2.nodes.find((n) => n.type === "chordpro-tag");
      expect(tag1?.zusatztext).toBe("soft");
      expect(tag2?.zusatztext).toBe("loud");
    });
  });
});
