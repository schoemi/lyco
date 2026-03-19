"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChordProNode } from "@/lib/vocal-tag/chordpro-node-extension";
import { ChordProMark } from "@/lib/vocal-tag/chordpro-mark-extension";
import { AutocompletePlugin } from "@/lib/vocal-tag/autocomplete-plugin";
import { suggestionRenderer } from "@/lib/vocal-tag/suggestion-renderer";
import { VocalTagToolbar } from "./vocal-tag-toolbar";
import { ChordProExportButton } from "./chordpro-export-button";
import { ChordProImportButton } from "./chordpro-import-button";
import { LivePreview } from "./live-preview";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import { serializeChordPro } from "@/lib/vocal-tag/chordpro-serializer";
import { AppIcon } from "@/components/ui/iconify-icon";
import type { TagDefinitionData, ChordProNode as ChordProNodeType } from "@/types/vocal-tag";

/**
 * VocalTagEditor – Hauptkomponente für den Vocal-Tag-Editor.
 *
 * Vereint TipTap-Editor mit ChordPro-Node Extension, Toolbar, Autocomplete,
 * Keyboard-Shortcuts, Import/Export und optionaler Live-Vorschau.
 *
 * Tag-Definitionen werden per API geladen und an alle Unterkomponenten weitergegeben.
 *
 * Validates: Requirements 5.1, 6.1, 7.1, 8.1
 */

export interface VocalTagEditorProps {
  /** Initialer ChordPro-Rohtext */
  initialContent?: string;
  /** Callback bei Änderungen – liefert den serialisierten ChordPro-Rohtext */
  onChange?: (rawText: string) => void;
  /** Ob die Live-Vorschau angezeigt werden soll */
  showPreview?: boolean;
  /** Song-ID für die Vorschau-Persistenz */
  songId?: string;
  /** Dateiname für den Export (ohne Erweiterung) */
  exportFilename?: string;
}

export function VocalTagEditor({
  initialContent = "",
  onChange,
  showPreview = false,
  songId = "default",
  exportFilename = "songtext",
}: VocalTagEditorProps) {
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState(initialContent);
  const initialContentApplied = useRef(false);

  // Fetch tag definitions from API on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchTags() {
      try {
        const res = await fetch("/api/tag-definitions");
        if (!res.ok) {
          throw new Error(`Fehler beim Laden der Tag-Definitionen (${res.status})`);
        }
        const data = await res.json();
        const defs: TagDefinitionData[] = Array.isArray(data) ? data : data.definitions ?? [];
        if (!cancelled) {
          setTagDefinitions(defs);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unbekannter Fehler beim Laden der Tag-Definitionen",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTags();
    return () => {
      cancelled = true;
    };
  }, []);

  // Known tag shortcodes for the parser
  const knownTags = useMemo(
    () => tagDefinitions.map((td) => td.tag),
    [tagDefinitions],
  );

  // Suggestion render callbacks for the autocomplete plugin
  const suggestionRender = useMemo(() => suggestionRenderer(), []);

  // Initialize TipTap editor
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          // Disable code block and horizontal rule to keep editor simple
          codeBlock: false,
          horizontalRule: false,
        }),
        ChordProNode.configure({
          tagDefinitions,
        }),
        ChordProMark.configure({
          tagDefinitions,
        }),
        AutocompletePlugin.configure({
          tagDefinitions,
          suggestion: {
            render: suggestionRender,
          },
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-3",
          "aria-label": "Vocal-Tag-Editor",
        },
      },
      onUpdate: ({ editor: ed }) => {
        // Serialize editor content to ChordPro raw text
        const serialized = editorToChordPro(ed);
        setRawText(serialized);
        onChange?.(serialized);
      },
    },
    [tagDefinitions],
  );

  // Load initial content into the editor once tag definitions are available
  useEffect(() => {
    if (!editor || tagDefinitions.length === 0 || initialContentApplied.current) {
      return;
    }
    if (initialContent) {
      loadChordProIntoEditor(editor, initialContent, knownTags);
      initialContentApplied.current = true;
    }
  }, [editor, tagDefinitions, initialContent, knownTags]);

  // Handle import: replace editor content with imported nodes
  const handleImport = useCallback(
    (nodes: ChordProNodeType[], _warnings: string[]) => {
      if (!editor) return;
      const content = chordProNodesToTipTap(nodes);
      editor.commands.setContent(content);
    },
    [editor],
  );

  // Get current editor content as ChordProNode array for export
  const exportNodes = useMemo(() => {
    if (!editor) return [];
    return editorToChordProNodes(editor);
  }, [editor, rawText]); // rawText dependency ensures re-computation on changes

  // Check if editor has content (for import confirmation dialog)
  const hasContent = useMemo(() => {
    if (!editor) return false;
    return !editor.isEmpty;
  }, [editor, rawText]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-neutral-500">
        <AppIcon icon="fa6-solid:spinner" className="animate-spin mr-2" />
        Lade Tag-Definitionen…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200"
      >
        <AppIcon icon="fa6-solid:triangle-exclamation" className="mr-2" />
        {error}
      </div>
    );
  }

  const editorContent = (
    <div className="vocal-tag-editor">
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <VocalTagToolbar editor={editor} tagDefinitions={tagDefinitions} />
        <div className="ml-auto flex items-center gap-1.5">
          <ChordProImportButton
            knownTags={knownTags}
            onImport={handleImport}
            hasExistingContent={hasContent}
          />
          <ChordProExportButton
            nodes={exportNodes}
            filename={exportFilename}
            disabled={!hasContent}
          />
        </div>
      </div>

      {/* Editor area */}
      <div className="rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <EditorContent editor={editor} />
      </div>
    </div>
  );

  if (showPreview) {
    return (
      <LivePreview
        text={rawText}
        tagDefinitions={tagDefinitions}
        songId={songId}
      >
        {editorContent}
      </LivePreview>
    );
  }

  return editorContent;
}

// --- Helper functions ---

/**
 * Converts TipTap editor JSON content to ChordPro raw text.
 */
function editorToChordPro(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";
  const nodes = editorToChordProNodes(editor);
  return serializeChordPro(nodes);
}

/**
 * Extracts ChordProNode[] from the TipTap editor's JSON content.
 * Handles both inline ChordProNode atoms and ChordProMark ranges.
 */
function editorToChordProNodes(
  editor: NonNullable<ReturnType<typeof useEditor>>,
): ChordProNodeType[] {
  const json = editor.getJSON();
  const result: ChordProNodeType[] = [];

  // Walk through the document's paragraph nodes
  for (const block of json.content ?? []) {
    // Add line breaks between paragraphs (except the first)
    if (result.length > 0) {
      result.push({ type: "text", content: "\n" });
    }

    for (const inline of block.content ?? []) {
      const attrs = (inline as Record<string, unknown>).attrs as Record<string, unknown> | undefined;
      if (inline.type === "chordProNode") {
        result.push({
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
          result.push({
            type: "chordpro-range",
            tag: (markAttrs?.tag as string) ?? "",
            zusatztext: (markAttrs?.zusatztext as string) ?? "",
            unknown: (markAttrs?.unknown as boolean) ?? false,
            rangeText: text,
          });
        } else {
          result.push({ type: "text", content: text });
        }
      }
    }
  }

  return result;
}

/**
 * Parses ChordPro raw text and loads it into the TipTap editor.
 */
function loadChordProIntoEditor(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  rawText: string,
  knownTags: string[],
): void {
  const parseResult = parseChordPro(rawText, knownTags);
  const content = chordProNodesToTipTap(parseResult.nodes);
  editor.commands.setContent(content);
}

/**
 * Converts ChordProNode[] into TipTap-compatible JSON content.
 */
function chordProNodesToTipTap(nodes: ChordProNodeType[]): Record<string, unknown> {
  // Split nodes by newlines into paragraphs
  const paragraphs: ChordProNodeType[][] = [[]];

  for (const node of nodes) {
    if (node.type === "text" && node.content?.includes("\n")) {
      // Split text node by newlines
      const parts = node.content.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          paragraphs.push([]);
        }
        if (parts[i]) {
          paragraphs[paragraphs.length - 1].push({
            type: "text",
            content: parts[i],
          });
        }
      }
    } else {
      paragraphs[paragraphs.length - 1].push(node);
    }
  }

  const doc = {
    type: "doc",
    content: paragraphs.map((para) => ({
      type: "paragraph",
      content: para.length === 0
        ? undefined
        : para.map((node) => {
            if (node.type === "chordpro-tag") {
              return {
                type: "chordProNode",
                attrs: {
                  tag: node.tag ?? "",
                  zusatztext: node.zusatztext ?? "",
                  unknown: node.unknown ?? false,
                },
              };
            }
            if (node.type === "chordpro-range") {
              return {
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
              };
            }
            return {
              type: "text",
              text: node.content ?? "",
            };
          }),
    })),
  };

  return doc;
}
