import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { TagDefinitionData } from "@/types/vocal-tag";

/**
 * AutocompletePlugin – TipTap extension that provides autocomplete for ChordPro tags.
 *
 * Triggers on `{` input, shows all tag definitions with icon, label and shortcode.
 * Filters by typed text (search in `tag` and `label`).
 * Selection via click or Enter inserts tag and opens TagPopover.
 * Escape closes menu without inserting.
 * Sort by `indexNr`, navigate with arrow keys.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

export const autocompletePluginKey = new PluginKey("chordproAutocomplete");

export interface AutocompletePluginOptions {
  tagDefinitions: TagDefinitionData[];
  suggestion: Partial<SuggestionOptions<TagDefinitionData, TagDefinitionData>>;
}

export const AutocompletePlugin = Extension.create<AutocompletePluginOptions>({
  name: "chordproAutocomplete",

  addOptions() {
    return {
      tagDefinitions: [],
      suggestion: {
        char: "{",
        pluginKey: autocompletePluginKey,
        allowSpaces: false,
        allowedPrefixes: null,
      },
    };
  },

  addProseMirrorPlugins() {
    const tagDefinitions = this.options.tagDefinitions;

    return [
      Suggestion<TagDefinitionData, TagDefinitionData>({
        editor: this.editor,
        ...this.options.suggestion,
        char: "{",
        pluginKey: autocompletePluginKey,
        allowedPrefixes: null,
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          const filtered = tagDefinitions.filter((td) => {
            if (!q) return true;
            return (
              td.tag.toLowerCase().includes(q) ||
              td.label.toLowerCase().includes(q)
            );
          });
          return filtered.sort((a, b) => a.indexNr - b.indexNr);
        },
        command: ({ editor, range, props: selectedTag }) => {
          // Delete the trigger `{` and any typed query, then insert the ChordPro node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertChordProTag({ tag: selectedTag.tag })
            .run();
        },
      }),
    ];
  },
});
