import { Mark, mergeAttributes } from "@tiptap/core";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * ChordProMark – TipTap Mark Extension for range-based ChordPro vocal tags.
 *
 * Wraps selected text with a colored highlight and prepends the tag icon.
 * Used when the user selects text and clicks a tag button.
 *
 * Serialized as `{tag: zusatztext}marked text{/tag}` in ChordPro format.
 *
 * Attributes:
 *   - `tag`        – the ChordPro tag identifier
 *   - `zusatztext` – free-text singing instruction
 *   - `unknown`    – true when the tag has no matching TagDefinition
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chordProMark: {
      /**
       * Toggle a ChordPro range mark on the current selection.
       */
      setChordProMark: (attrs: {
        tag: string;
        zusatztext?: string;
        unknown?: boolean;
      }) => ReturnType;
      /**
       * Remove a ChordPro range mark from the current selection.
       */
      unsetChordProMark: () => ReturnType;
    };
  }
}

export interface ChordProMarkOptions {
  tagDefinitions: TagDefinitionData[];
}

export const ChordProMark = Mark.create<ChordProMarkOptions>({
  name: "chordProMark",

  addOptions() {
    return {
      tagDefinitions: [],
    };
  },

  addAttributes() {
    return {
      tag: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chordpro-mark-tag") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-chordpro-mark-tag": attributes.tag,
        }),
      },
      zusatztext: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chordpro-mark-zusatztext") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-chordpro-mark-zusatztext": attributes.zusatztext,
        }),
      },
      unknown: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-chordpro-mark-unknown") === "true",
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.unknown) return {};
          return { "data-chordpro-mark-unknown": "true" };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-chordpro-mark-tag]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const tag = (HTMLAttributes["data-chordpro-mark-tag"] as string) ?? "";
    const tagDefs = this.options.tagDefinitions;
    const definition = tagDefs.find((d: TagDefinitionData) => d.tag === tag);
    const color = definition?.color ?? "#9ca3af";
    const label = definition?.label ?? tag;
    const zusatztext =
      (HTMLAttributes["data-chordpro-mark-zusatztext"] as string) ?? "";

    const ariaLabel = zusatztext ? `${label}: ${zusatztext}` : label;

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "aria-label": ariaLabel,
        class: "chordpro-mark",
        style: `background-color: ${color}20; border-bottom: 2px solid ${color}; padding: 1px 2px; border-radius: 2px;`,
        title: zusatztext || undefined,
      }),
      0, // content hole — TipTap renders the marked text here
    ];
  },

  addCommands() {
    return {
      setChordProMark:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, {
            tag: attrs.tag,
            zusatztext: attrs.zusatztext ?? "",
            unknown: attrs.unknown ?? false,
          });
        },
      unsetChordProMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
