"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChordProNode } from "@/lib/vocal-tag/chordpro-node-extension";
import { ChordProMark } from "@/lib/vocal-tag/chordpro-mark-extension";
import { AutocompletePlugin } from "@/lib/vocal-tag/autocomplete-plugin";
import { suggestionRenderer } from "@/lib/vocal-tag/suggestion-renderer";
import { VocalTagToolbar } from "@/components/vocal-tag/vocal-tag-toolbar";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { serializeChordPro } from "@/lib/vocal-tag/chordpro-serializer";
import type { TagDefinitionData, ChordProNode as ChordProNodeType } from "@/types/vocal-tag";

/**
 * ZeileTagInput – Inline TipTap editor for a single zeile with ChordPro vocal tag support.
 *
 * Replaces the plain text <input> in the zeile edit form.
 * Supports: inline badges, toolbar, autocomplete via `{`, keyboard shortcuts.
 * Single-line only (Enter is blocked).
 */

export interface ZeileTagInputProps {
  id?: string;
  value: string;
  onChange: (chordProText: string) => void;
  tagDefinitions: TagDefinitionData[];
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaLabel?: string;
  className?: string;
}

export function ZeileTagInput({
  id,
  value,
  onChange,
  tagDefinitions,
  ariaRequired,
  ariaInvalid,
  ariaDescribedBy,
  ariaLabel = "Zeilentext mit Vocal Tags",
  className,
}: ZeileTagInputProps) {
  const initialLoaded = useRef(false);
  const knownTags = useMemo(() => tagDefinitions.map((td) => td.tag), [tagDefinitions]);
  const suggestionRender = useMemo(() => suggestionRenderer(), []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          codeBlock: false,
          horizontalRule: false,
          // Single-line: disable hard break and blockquote
          hardBreak: false,
          blockquote: false,
        }),
        ChordProNode.configure({ tagDefinitions }),
        ChordProMark.configure({ tagDefinitions }),
        AutocompletePlugin.configure({
          tagDefinitions,
          suggestion: { render: suggestionRender },
        }),
      ],
      editorProps: {
        attributes: {
          class: "focus:outline-none text-sm",
          ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
          ...(ariaRequired ? { "aria-required": "true" } : {}),
          ...(ariaInvalid ? { "aria-invalid": "true" } : {}),
          ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        },
        // Block Enter to keep it single-line
        handleKeyDown(_view, event) {
          if (event.key === "Enter") {
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const text = editorToChordPro(ed, knownTags);
        onChange(text);
      },
    },
    [tagDefinitions],
  );

  // Load initial value once
  useEffect(() => {
    if (!editor || initialLoaded.current) return;
    // Load even without tag definitions — plain text still needs to appear
    if (value) {
      const parsed = parseChordPro(value, knownTags);
      const content = chordProNodesToTipTap(parsed.nodes);
      editor.commands.setContent(content);
      initialLoaded.current = true;
    } else {
      // Empty value — mark as loaded so we don't re-trigger
      initialLoaded.current = true;
    }
  }, [editor, value, tagDefinitions, knownTags]);

  // Focus the editor programmatically
  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  // Auto-focus on mount
  useEffect(() => {
    if (editor) {
      requestAnimationFrame(() => editor.commands.focus());
    }
  }, [editor]);

  return (
    <div className={className}>
      <VocalTagToolbar editor={editor} tagDefinitions={tagDefinitions} />
      <div
        id={id}
        className={`mt-1 rounded-md border px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-newsong-500 ${
          ariaInvalid ? "border-error-500" : "border-neutral-300"
        }`}
        onClick={focus}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// --- Helpers (single-line variants) ---

function editorToChordPro(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  _knownTags: string[],
): string {
  const json = editor.getJSON();
  const nodes: ChordProNodeType[] = [];

  for (const block of json.content ?? []) {
    for (const inline of block.content ?? []) {
      const attrs = (inline as Record<string, unknown>).attrs as Record<string, unknown> | undefined;
      if (inline.type === "chordProNode") {
        nodes.push({
          type: "chordpro-tag",
          tag: (attrs?.tag as string) ?? "",
          zusatztext: (attrs?.zusatztext as string) ?? "",
          unknown: (attrs?.unknown as boolean) ?? false,
        });
      } else if (inline.type === "text") {
        const text = ((inline as Record<string, unknown>).text as string) ?? "";
        const marks = (inline as Record<string, unknown>).marks as Array<Record<string, unknown>> | undefined;
        const chordProMark = marks?.find((m) => m.type === "chordProMark");

        if (chordProMark) {
          const markAttrs = chordProMark.attrs as Record<string, unknown> | undefined;
          nodes.push({
            type: "chordpro-range",
            tag: (markAttrs?.tag as string) ?? "",
            zusatztext: (markAttrs?.zusatztext as string) ?? "",
            unknown: (markAttrs?.unknown as boolean) ?? false,
            rangeText: text,
          });
        } else {
          nodes.push({ type: "text", content: text });
        }
      }
    }
  }

  return serializeChordPro(nodes);
}

function chordProNodesToTipTap(nodes: ChordProNodeType[]): Record<string, unknown> {
  const content: Record<string, unknown>[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      if (node.content) {
        content.push({ type: "text", text: node.content });
      }
    } else if (node.type === "chordpro-tag") {
      content.push({
        type: "chordProNode",
        attrs: {
          tag: node.tag,
          zusatztext: node.zusatztext ?? "",
          unknown: node.unknown ?? false,
        },
      });
    } else if (node.type === "chordpro-range") {
      content.push({
        type: "text",
        text: node.rangeText ?? "",
        marks: [
          {
            type: "chordProMark",
            attrs: {
              tag: node.tag ?? "",
              zusatztext: node.zusatztext ?? "",
              unknown: node.unknown ?? false,
            },
          },
        ],
      });
    }
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content.length > 0 ? content : undefined,
      },
    ],
  };
}
