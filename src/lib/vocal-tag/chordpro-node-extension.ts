import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InlineBadge } from "@/components/vocal-tag/inline-badge";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * ChordProNode – TipTap Inline-Node Extension for ChordPro vocal tags.
 *
 * Renders `{tag: zusatztext}` markup as inline `<span>` elements within the
 * editor document. Each node carries three attributes:
 *   - `tag`        – the ChordPro tag identifier (e.g. "belt", "falsett")
 *   - `zusatztext` – free-text singing instruction
 *   - `unknown`    – true when the tag has no matching TagDefinition
 *
 * The node is inline (group: 'inline') so it does not interrupt text flow.
 *
 * Validates: Requirements 5.1, 5.6
 */

export interface ChordProNodeAttributes {
  tag: string;
  zusatztext: string;
  unknown: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chordProNode: {
      /**
       * Insert a ChordPro tag node at the current cursor position.
       */
      insertChordProTag: (attrs: {
        tag: string;
        zusatztext?: string;
        unknown?: boolean;
      }) => ReturnType;
    };
  }
}

export interface ChordProNodeOptions {
  /** Tag definitions loaded from the API – passed to the InlineBadge NodeView */
  tagDefinitions: TagDefinitionData[];
}

export const ChordProNode = Node.create<ChordProNodeOptions>({
  name: "chordProNode",

  group: "inline",

  inline: true,

  atom: true,

  addOptions() {
    return {
      tagDefinitions: [],
    };
  },

  addAttributes() {
    return {
      tag: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-chordpro-tag") ?? "",
        renderHTML: (attributes) => ({
          "data-chordpro-tag": attributes.tag,
        }),
      },
      zusatztext: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-zusatztext") ?? "",
        renderHTML: (attributes) => ({
          "data-zusatztext": attributes.zusatztext,
        }),
      },
      unknown: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-unknown") === "true",
        renderHTML: (attributes) => {
          if (!attributes.unknown) return {};
          return { "data-unknown": "true" };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-chordpro-tag]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const tag = HTMLAttributes["data-chordpro-tag"] ?? "";
    const zusatztext = HTMLAttributes["data-zusatztext"] ?? "";

    const ariaLabel = zusatztext
      ? `${tag}: ${zusatztext}`
      : tag;

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "aria-label": ariaLabel,
        class: "chordpro-tag",
      }),
    ];
  },

  addCommands() {
    return {
      insertChordProTag:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              tag: attrs.tag,
              zusatztext: attrs.zusatztext ?? "",
              unknown: attrs.unknown ?? false,
            },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {};

    for (let n = 1; n <= 9; n++) {
      shortcuts[`Mod-${n}`] = () => {
        const sorted = [...this.options.tagDefinitions].sort(
          (a, b) => a.indexNr - b.indexNr,
        );

        if (n > sorted.length) {
          return false;
        }

        const tagDef = sorted[n - 1];
        return this.editor.commands.insertChordProTag({ tag: tagDef.tag });
      };
    }

    return shortcuts;
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineBadge);
  },
});
