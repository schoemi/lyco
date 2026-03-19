"use client";

import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify, UNKNOWN_TAG_ICON } from "@/lib/icon-utils";

/**
 * CompactView – Read-only compact rendering of a song text with vocal tags.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

export interface CompactViewProps {
  text: string;
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

  const definition = tagDefinitions.find((d) => d.tag === node.tag);
  const icon = faClassToIconify(definition?.icon ?? UNKNOWN_TAG_ICON);
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? node.tag;

  if (node.type === "chordpro-range") {
    return (
      <span
        className="compact-range-marker inline-flex items-center gap-0.5"
        style={{
          backgroundColor: `${color}20`,
          borderBottom: `2px solid ${color}`,
          borderRadius: "2px",
          padding: "0 2px",
        }}
        aria-label={label}
      >
        <AppIcon icon={icon} color={color} className="text-[0.65rem] leading-none" />
        <span>{node.rangeText}</span>
      </span>
    );
  }

  return (
    <span
      className="compact-tag-marker relative inline-flex flex-col items-center"
      style={{ verticalAlign: "top" }}
    >
      <span
        className="compact-tag-icon block text-[0.65rem] leading-none -mb-0.5"
        style={{ color }}
        role="img"
        aria-label={label}
      >
        <AppIcon icon={icon} />
      </span>
    </span>
  );
}
