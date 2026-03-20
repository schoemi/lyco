"use client";

import { useMemo } from "react";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify, UNKNOWN_TAG_ICON } from "@/lib/icon-utils";

/**
 * Renders a single line of text with inline vocal tag icons (compact style).
 * Used in Karaoke and Vocal Trainer views when vocal tag display is enabled.
 */

interface VocalTagZeileProps {
  rawText: string;
  tagDefinitions: TagDefinitionData[];
}

export function VocalTagZeile({ rawText, tagDefinitions }: VocalTagZeileProps) {
  const knownTags = useMemo(
    () => tagDefinitions.map((d) => d.tag),
    [tagDefinitions]
  );
  const { nodes } = useMemo(
    () => parseChordPro(rawText, knownTags),
    [rawText, knownTags]
  );

  return (
    <span>
      {nodes.map((node, i) => (
        <VocalTagInlineNode key={i} node={node} tagDefinitions={tagDefinitions} />
      ))}
    </span>
  );
}

function VocalTagInlineNode({
  node,
  tagDefinitions,
}: {
  node: ChordProNode;
  tagDefinitions: TagDefinitionData[];
}) {
  if (node.type === "text") {
    return <>{node.content}</>;
  }

  const definition = tagDefinitions.find((d) => d.tag === node.tag);
  const icon = faClassToIconify(definition?.icon ?? UNKNOWN_TAG_ICON);
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? node.tag;

  if (node.type === "chordpro-range") {
    return (
      <span
        className="inline-flex items-center gap-0.5"
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

  // Inline tag: show icon only
  return (
    <span
      className="inline-flex items-center mx-0.5"
      style={{ color }}
      role="img"
      aria-label={label}
    >
      <AppIcon icon={icon} className="text-[0.7rem] leading-none" />
    </span>
  );
}
