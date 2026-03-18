"use client";

import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

/**
 * CompactView – Read-only compact rendering of a song text with vocal tags.
 *
 * - Renders song text without ChordPro raw syntax
 * - Shows only tag icons (in tag color) above text positions
 * - Ignores zusatztext entirely
 * - Uses a generic warning icon for unknown tags
 * - Does not interrupt text flow
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

export interface CompactViewProps {
  /** Raw song text potentially containing ChordPro tags */
  text: string;
  /** Available tag definitions for resolving icons and colors */
  tagDefinitions: TagDefinitionData[];
}

export function CompactView({ text, tagDefinitions }: CompactViewProps) {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);

  return (
    <div className="compact-view leading-relaxed" role="article" aria-label="Kompakte Ansicht">
      {nodes.map((node, index) => (
        <CompactNode key={index} node={node} tagDefinitions={tagDefinitions} />
      ))}
    </div>
  );
}

function CompactNode({
  node,
  tagDefinitions,
}: {
  node: ChordProNode;
  tagDefinitions: TagDefinitionData[];
}) {
  if (node.type === "text") {
    return <span>{node.content}</span>;
  }

  // chordpro-tag node: render icon above the inline position
  const definition = tagDefinitions.find((d) => d.tag === node.tag);
  const icon = definition?.icon ?? "fa-solid fa-circle-question";
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? node.tag;

  return (
    <span
      className="compact-tag-marker relative inline-flex flex-col items-center"
      style={{ verticalAlign: "top" }}
    >
      <span
        className="compact-tag-icon block text-[0.65rem] leading-none -mb-0.5"
        style={{ color }}
        aria-label={label}
        role="img"
      >
        <i className={icon} aria-hidden="true" />
      </span>
    </span>
  );
}
